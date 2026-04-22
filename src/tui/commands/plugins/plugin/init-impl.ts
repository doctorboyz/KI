/**
 * aoi plugin init <name> --ts
 *
 * Scaffolds a 5-file TypeScript plugin at ./<name>/:
 *   plugin.json       — full v1 manifest with blank-but-present placeholders
 *   src/index.ts      — @aoi/sdk hello-world stub
 *   package.json      — author-side deps (typescript, @aoi/sdk via workspace)
 *   tsconfig.json     — strict ESM bundler resolution
 *   README.md         — 10-line quickstart
 *
 * Phase A: --ts is the only supported target. "wasm" lands in Phase C.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { parseFlags } from "../../../../cli-src/parse-args";

// Repo root (for resolving the workspace SDK absolute path baked into
// scaffolded package.json). src/commands/plugins/plugin/init-impl.ts → ../../../..
const AOI_DIR = resolve(import.meta.dir, "../../../..");
const SDK_PKG_PATH = join(AOI_DIR, "packages", "sdk");

const NAME_RE = /^[a-z][a-z0-9-]*$/;

export async function cmdPluginInit(args: string[]): Promise<void> {
  const flags = parseFlags(args, { "--ts": Boolean }, 0);
  const name = flags._[0];

  if (!name || name.startsWith("-")) {
    throw new Error("usage: aoi plugin init <name> --ts");
  }
  if (!NAME_RE.test(name)) {
    throw new Error(
      `invalid name "${name}" — use lowercase letters, digits, hyphens (must start with a letter)`,
    );
  }
  if (!flags["--ts"]) {
    throw new Error("usage: aoi plugin init <name> --ts  (only --ts is supported in Phase A)");
  }

  const dest = join(process.cwd(), name);
  if (existsSync(dest)) {
    throw new Error(`${dest} already exists`);
  }

  mkdirSync(join(dest, "src"), { recursive: true });

  // 1. plugin.json — full v1 manifest, blank-but-present placeholders
  const manifest = {
    name,
    version: "0.1.0",
    sdk: "^1.0.0",
    target: "js",
    entry: "./src/index.ts",
    artifact: { path: "dist/index.js", sha256: null },
    capabilities: [] as string[],
    description: `${name} — a aoi plugin`,
    cli: { command: name, help: `Invoke ${name}` },
  };
  writeFileSync(join(dest, "plugin.json"), JSON.stringify(manifest, null, 2) + "\n");

  // 2. src/index.ts — @aoi/sdk hello-world stub
  writeFileSync(
    join(dest, "src", "index.ts"),
    `import { aoi } from "@aoi/sdk";
import type { InvokeContext, InvokeResult } from "@aoi/sdk/plugin";

export default async function (ctx: InvokeContext): Promise<InvokeResult> {
  const id = await aoi.identity();
  return { ok: true, output: \`hello from \${id.node}!\` };
}
`,
  );

  // 3. package.json — workspace-linked SDK via file: protocol (absolute path
  // into the aoi tree). Phase A: bundler inlines this on `aoi plugin build`.
  const pkg = {
    name,
    version: "0.1.0",
    type: "module",
    main: "src/index.ts",
    scripts: { build: "aoi plugin build" },
    devDependencies: {
      "@aoi/sdk": `file:${SDK_PKG_PATH}`,
      typescript: "^5.0.0",
    },
  };
  writeFileSync(join(dest, "package.json"), JSON.stringify(pkg, null, 2) + "\n");

  // 4. tsconfig.json — strict, ESM target, bundler module resolution
  const tsconfig = {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "bundler",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      types: ["bun"],
      noEmit: true,
    },
    include: ["src/**/*"],
  };
  writeFileSync(join(dest, "tsconfig.json"), JSON.stringify(tsconfig, null, 2) + "\n");

  // 5. README.md — 10-line quickstart
  writeFileSync(
    join(dest, "README.md"),
    `# ${name}

A aoi plugin.

## Build

    bun install
    aoi plugin build

## Install

    aoi plugin install ./${name}-0.1.0.tgz

## Invoke

    aoi ${name}
`,
  );

  console.log(`\x1b[36m⚡\x1b[0m scaffolded \x1b[1m${name}\x1b[0m (ts)`);
  console.log(`  next: cd ${name} && bun install && aoi plugin build`);
}
