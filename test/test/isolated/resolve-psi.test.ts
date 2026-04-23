import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { resolvePsi } from "../../src/commands/plugins/team/team-helpers";

// Regression test for #393 Bug A — resolvePsi walks up from cwd to find
// kappa root (CLAUDE.md + ψ/), preventing rogue nested vaults when the
// CLI is run from a sub-directory.

let kappaRoot: string;
let originalCwd: string;

beforeEach(() => {
  originalCwd = process.cwd();
  kappaRoot = mkdtempSync(join(tmpdir(), "maw-resolvepsi-test-"));
  mkdirSync(join(kappaRoot, "ψ", "memory", "mailbox"), { recursive: true });
  writeFileSync(join(kappaRoot, "CLAUDE.md"), "# test kappa\n");
});

afterEach(() => {
  process.chdir(originalCwd);
  try { rmSync(kappaRoot, { recursive: true, force: true }); } catch { /* ok */ }
});

describe("resolvePsi — walks up from cwd (#393 Bug A)", () => {
  test("returns <root>/ψ when cwd is the kappa root", () => {
    process.chdir(kappaRoot);
    expect(resolvePsi()).toBe(join(kappaRoot, "ψ"));
  });

  test("walks up one level — cwd is a sub-directory", () => {
    const sub = join(kappaRoot, "ψ", "writing");
    mkdirSync(sub, { recursive: true });
    process.chdir(sub);
    expect(resolvePsi()).toBe(join(kappaRoot, "ψ"));
  });

  test("walks up multiple levels — deeply nested cwd", () => {
    const deep = join(kappaRoot, "ψ", "writing", "2026-04-17", "clarity");
    mkdirSync(deep, { recursive: true });
    process.chdir(deep);
    expect(resolvePsi()).toBe(join(kappaRoot, "ψ"));
  });

  test("does NOT descend past a non-kappa sub-dir (no rogue nested vault)", () => {
    // Create a ψ/ child of the kappa root that doesn't have its own CLAUDE.md
    const nestedPsi = join(kappaRoot, "ψ", "writing", "ψ");
    mkdirSync(nestedPsi, { recursive: true });
    const below = join(kappaRoot, "ψ", "writing");
    process.chdir(below);
    // Should return the OUTER ψ (root), not the rogue inner one
    expect(resolvePsi()).toBe(join(kappaRoot, "ψ"));
  });

  test("fallback — no kappa root up the tree returns cwd/ψ", () => {
    const orphan = mkdtempSync(join(tmpdir(), "maw-orphan-"));
    try {
      process.chdir(orphan);
      expect(resolvePsi()).toBe(join(orphan, "ψ"));
    } finally {
      try { rmSync(orphan, { recursive: true, force: true }); } catch { /* ok */ }
    }
  });

  test("requires BOTH markers: ψ/ alone without CLAUDE.md falls through", () => {
    const fakeKappa = mkdtempSync(join(tmpdir(), "maw-fake-"));
    mkdirSync(join(fakeKappa, "ψ"), { recursive: true });
    // no CLAUDE.md written
    const sub = join(fakeKappa, "ψ", "writing");
    mkdirSync(sub, { recursive: true });
    try {
      process.chdir(sub);
      // Walks up, but fakeKappa is missing CLAUDE.md → falls through
      // Should NOT match fakeKappa. Falls back to cwd/ψ.
      expect(resolvePsi()).toBe(join(sub, "ψ"));
    } finally {
      try { rmSync(fakeKappa, { recursive: true, force: true }); } catch { /* ok */ }
    }
  });
});
