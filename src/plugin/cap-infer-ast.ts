/**
 * AST-based capability inference — Phase B replacement for regex scanning.
 *
 * Problem with the Phase A regex approach:
 *   • `const { id } = ki; id()` — destructured usage escapes `ki\.(\w+)` regex
 *   • `const m = ki; m.identity()` — aliased binding escapes regex
 *   • `ki["wake"]()` — dynamic bracket-access escapes `ki\.\w+` regex
 *   • Transitive imports (`import ki from "ki-sdk"`) are not followed by regex
 *
 * This module uses the TypeScript Compiler API to:
 *   1. Parse the source into an AST (no type-checker needed — parse only).
 *   2. Walk import declarations to find the local name(s) bound to the ki SDK.
 *   3. Walk call expressions and member accesses to detect capability usage
 *      through any of the four patterns above.
 *
 * Invariant: outputs are equal-or-stricter than Phase A regex.
 * When the same source is fed to both, the AST path must detect everything
 * the regex path detects PLUS additional patterns the regex misses.
 *
 * SDK import specifiers that are treated as "ki" bindings:
 *   • "@ki/sdk", "ki", "ki-sdk", "ki/sdk" (all common forms)
 *   • Any import from those specifiers becomes a tracked binding.
 *
 * Module capability mappings (non-SDK):
 *   • "node:fs", "node:fs/promises" → fs:read
 *   • "node:child_process"          → proc:spawn
 *   • "bun:ffi"                     → ffi:any
 *   • global fetch()                → net:fetch
 */

import ts from "typescript";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Import specifiers recognised as the ki SDK. */
const KI_SDK_SPECIFIERS = new Set(["@ki/sdk", "ki", "ki-sdk", "ki/sdk"]);

/** Module specifiers that map to a fixed capability (non-SDK). */
const MODULE_CAP_MAP: Record<string, string> = {
  "node:fs": "fs:read",
  "node:fs/promises": "fs:read",
  "node:child_process": "proc:spawn",
  "bun:ffi": "ffi:any",
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Infer capabilities from TypeScript/JavaScript source text using AST traversal.
 *
 * @param source - Raw source text (TS or JS)
 * @param fileName - Optional virtual file name for TS parser (affects dialect)
 * @returns Sorted, deduplicated capability strings
 */
export function inferCapabilitiesAst(source: string, fileName = "plugin.ts"): string[] {
  const caps = new Set<string>();

  // Parse into AST. We use `createSourceFile` (no type-checker) for speed.
  const sf = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.ESNext,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX,
  );

  // Phase 1: collect all local bindings that come from ki SDK imports.
  //
  // We track two kinds:
  //   • `kiDefaultBindings` — names bound to the default export (the ki object)
  //     e.g. `import ki from "@ki/sdk"` → "ki"
  //          `import * as ki from "@ki/sdk"` → "ki"
  //          `import kiAlias from "@ki/sdk"` → "kiAlias"
  //          `const m = ki; ...` → tracked via alias walk below
  //
  //   • `kiNamedBindings` — names bound to named exports (methods directly)
  //     e.g. `import { identity, send } from "@ki/sdk"` → { identity: "identity", send: "send" }
  //          `import { identity as id } from "@ki/sdk"` → { id: "identity" }
  //
  const kiDefaultBindings = new Set<string>(); // local names bound to ki object
  const kiNamedBindings = new Map<string, string>(); // local name → sdk method name

  collectImportBindings(sf, kiDefaultBindings, kiNamedBindings, caps);

  // Phase 2: walk the AST for alias assignments (`const m = ki`) and call sites.
  collectAliasAndCallSites(sf, kiDefaultBindings, kiNamedBindings, caps);

  return [...caps].sort();
}

// ─── Phase 1: import binding collection ──────────────────────────────────────

function collectImportBindings(
  sf: ts.SourceFile,
  kiDefaultBindings: Set<string>,
  kiNamedBindings: Map<string, string>,
  caps: Set<string>,
): void {
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;

    // Extract the raw module specifier string (strip quotes).
    const specNode = stmt.moduleSpecifier;
    if (!ts.isStringLiteral(specNode)) continue;
    const spec = specNode.text;

    // Non-SDK module capability mapping.
    if (spec in MODULE_CAP_MAP) {
      caps.add(MODULE_CAP_MAP[spec]);
      continue;
    }

    // SDK import — collect local bindings.
    if (!KI_SDK_SPECIFIERS.has(spec)) continue;

    const clause = stmt.importClause;
    if (!clause) continue;

    // Default import: `import ki from "@ki/sdk"`
    if (clause.name) {
      kiDefaultBindings.add(clause.name.text);
    }

    const bindings = clause.namedBindings;
    if (!bindings) continue;

    if (ts.isNamespaceImport(bindings)) {
      // `import * as ki from "@ki/sdk"` — namespace is equivalent to default
      kiDefaultBindings.add(bindings.name.text);
    } else if (ts.isNamedImports(bindings)) {
      // `import { identity, send as s } from "@ki/sdk"`
      for (const el of bindings.elements) {
        // el.name is the local alias; el.propertyName is the exported name (if aliased).
        const localName = el.name.text;
        const exportedName = el.propertyName ? el.propertyName.text : localName;
        kiNamedBindings.set(localName, exportedName);
      }
    }
  }
}

// ─── Phase 2: alias assignments + call sites ─────────────────────────────────

function collectAliasAndCallSites(
  sf: ts.SourceFile,
  kiDefaultBindings: Set<string>,
  kiNamedBindings: Map<string, string>,
  caps: Set<string>,
): void {
  // First pass: collect variable aliases like `const m = ki` and destructures
  // like `const { identity } = ki` before walking call sites.
  collectVariableAliases(sf, kiDefaultBindings, kiNamedBindings);

  // Second pass: walk all call expressions and member accesses.
  walkNode(sf, kiDefaultBindings, kiNamedBindings, caps);
}

/**
 * Pre-pass: find alias and destructure patterns over ki bindings.
 *
 * Handles:
 *   • `const m = ki` — simple alias, adds "m" to kiDefaultBindings
 *   • `const { identity } = ki` — destructure, adds "identity" → "identity" to kiNamedBindings
 *   • `const { identity: id } = ki` — renamed destructure, adds "id" → "identity"
 *
 * This pre-pass runs BEFORE the call-site walk so aliases/destructures at any
 * scope level are captured before their call sites are visited.
 */
function collectVariableAliases(
  node: ts.Node,
  kiDefaultBindings: Set<string>,
  kiNamedBindings: Map<string, string>,
): void {
  if (ts.isVariableDeclaration(node) && node.initializer) {
    const init = node.initializer;

    if (ts.isIdentifier(init) && kiDefaultBindings.has(init.text)) {
      if (ts.isIdentifier(node.name)) {
        // Pattern: `const m = ki` — simple alias
        kiDefaultBindings.add(node.name.text);
      } else if (ts.isObjectBindingPattern(node.name)) {
        // Pattern: `const { identity, send: s } = ki` — destructure
        for (const el of node.name.elements) {
          if (ts.isBindingElement(el) && ts.isIdentifier(el.name)) {
            const localName = el.name.text;
            // el.propertyName is the original key if aliased: `{ identity: id }` → propertyName = "identity"
            const exportedName =
              el.propertyName && ts.isIdentifier(el.propertyName)
                ? el.propertyName.text
                : localName;
            kiNamedBindings.set(localName, exportedName);
          }
        }
      }
    }
  }
  ts.forEachChild(node, (child) => collectVariableAliases(child, kiDefaultBindings, kiNamedBindings));
}

/** Main AST walker — detects capability call sites. */
function walkNode(
  node: ts.Node,
  kiDefaultBindings: Set<string>,
  kiNamedBindings: Map<string, string>,
  caps: Set<string>,
): void {
  // Pattern A: `ki.method(...)` or `ki["method"](...)`
  if (ts.isCallExpression(node)) {
    const expr = node.expression;

    if (ts.isPropertyAccessExpression(expr)) {
      // ki.identity() — property access
      if (
        ts.isIdentifier(expr.expression) &&
        kiDefaultBindings.has(expr.expression.text)
      ) {
        caps.add(`sdk:${expr.name.text}`);
      }
    } else if (ts.isElementAccessExpression(expr)) {
      // ki["identity"]() or ki[varKey]() — bracket access
      if (
        ts.isIdentifier(expr.expression) &&
        kiDefaultBindings.has(expr.expression.text)
      ) {
        if (ts.isStringLiteral(expr.argumentExpression)) {
          // Static string key — we know the method name
          caps.add(`sdk:${expr.argumentExpression.text}`);
        } else {
          // Dynamic key — we can't know which method; emit sentinel
          caps.add("sdk:*dynamic*");
        }
      }
    } else if (ts.isIdentifier(expr)) {
      // Pattern B: named import used directly — `identity()` (from `import { identity }`)
      const exportedName = kiNamedBindings.get(expr.text);
      if (exportedName !== undefined) {
        caps.add(`sdk:${exportedName}`);
      }

      // Pattern C: global fetch() — not a member access
      if (expr.text === "fetch") {
        caps.add("net:fetch");
      }
    }
  }

  // Pattern D: non-SDK module capabilities (dynamic require / import() calls)
  // Handles: require("node:fs"), require("bun:ffi"), import("node:child_process")
  if (ts.isCallExpression(node)) {
    const expr = node.expression;
    const arg0 = node.arguments[0];
    if (
      arg0 &&
      ts.isStringLiteral(arg0) &&
      (
        (ts.isIdentifier(expr) && expr.text === "require") ||
        expr.kind === ts.SyntaxKind.ImportKeyword
      )
    ) {
      const spec = arg0.text;
      if (spec in MODULE_CAP_MAP) {
        caps.add(MODULE_CAP_MAP[spec]);
      }
    }
  }

  ts.forEachChild(node, (child) =>
    walkNode(child, kiDefaultBindings, kiNamedBindings, caps),
  );
}
