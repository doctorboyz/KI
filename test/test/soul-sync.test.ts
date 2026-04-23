import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "fs";
import { join } from "path";

// Test the core sync logic directly (no ssh/tmux mocking needed)
// We test findParent, findChildren, and the syncDir logic

const TEST_DIR = join(import.meta.dir, ".test-soul-sync");
const CHILD_PSI = join(TEST_DIR, "child-kappa", "ψ");
const PARENT_PSI = join(TEST_DIR, "parent-kappa", "ψ");

function setup() {
  rmSync(TEST_DIR, { recursive: true, force: true });

  // Create child kappa with learnings
  mkdirSync(join(CHILD_PSI, "memory/learnings"), { recursive: true });
  mkdirSync(join(CHILD_PSI, "memory/retrospectives/2026-04"), { recursive: true });
  mkdirSync(join(CHILD_PSI, "memory/traces/2026-04-06"), { recursive: true });

  writeFileSync(join(CHILD_PSI, "memory/learnings/bitkub-api.md"), "# Bitkub API patterns\nlearned things");
  writeFileSync(join(CHILD_PSI, "memory/learnings/tax-calc.md"), "# Tax calculation\nquarterly process");
  writeFileSync(join(CHILD_PSI, "memory/retrospectives/2026-04/06-session.md"), "# Session retro\ngood work");
  writeFileSync(join(CHILD_PSI, "memory/traces/2026-04-06/2134_bitkub.md"), "# Trace: bitkub\nfound things");

  // Create parent kappa with some existing files
  mkdirSync(join(PARENT_PSI, "memory/learnings"), { recursive: true });
  mkdirSync(join(PARENT_PSI, "memory/retrospectives"), { recursive: true });
  mkdirSync(join(PARENT_PSI, "memory/traces"), { recursive: true });

  // Parent already has tax-calc (should NOT be overwritten)
  writeFileSync(join(PARENT_PSI, "memory/learnings/tax-calc.md"), "# PARENT VERSION - DO NOT OVERWRITE");
}

function cleanup() {
  rmSync(TEST_DIR, { recursive: true, force: true });
}

describe("soul-sync", () => {
  beforeEach(setup);
  afterEach(cleanup);

  describe("syncDir (core file copy logic)", () => {
    // Import the syncDir equivalent by testing through the module
    // Since syncDir is not exported, we test through the file system directly
    // using the same logic pattern

    test("copies new files from child to parent", () => {
      const { syncDirForTest } = require("./soul-sync-helpers");
      const src = join(CHILD_PSI, "memory/learnings");
      const dst = join(PARENT_PSI, "memory/learnings");

      const count = syncDirForTest(src, dst);

      // bitkub-api.md should be copied (new)
      expect(existsSync(join(dst, "bitkub-api.md"))).toBe(true);
      expect(readFileSync(join(dst, "bitkub-api.md"), "utf-8")).toContain("Bitkub API patterns");

      // tax-calc.md should NOT be overwritten (already exists in parent)
      expect(readFileSync(join(dst, "tax-calc.md"), "utf-8")).toBe("# PARENT VERSION - DO NOT OVERWRITE");

      // Only 1 file copied (bitkub-api.md), tax-calc.md was skipped
      expect(count).toBe(1);
    });

    test("creates nested directories as needed", () => {
      const { syncDirForTest } = require("./soul-sync-helpers");
      const src = join(CHILD_PSI, "memory/retrospectives");
      const dst = join(PARENT_PSI, "memory/retrospectives");

      const count = syncDirForTest(src, dst);

      // Should create 2026-04/ subdir and copy the file
      expect(existsSync(join(dst, "2026-04/06-session.md"))).toBe(true);
      expect(count).toBe(1);
    });

    test("handles missing source dir gracefully", () => {
      const { syncDirForTest } = require("./soul-sync-helpers");
      const count = syncDirForTest("/nonexistent/path", PARENT_PSI);
      expect(count).toBe(0);
    });

    test("syncs traces with nested date dirs", () => {
      const { syncDirForTest } = require("./soul-sync-helpers");
      const src = join(CHILD_PSI, "memory/traces");
      const dst = join(PARENT_PSI, "memory/traces");

      const count = syncDirForTest(src, dst);

      expect(existsSync(join(dst, "2026-04-06/2134_bitkub.md"))).toBe(true);
      expect(count).toBe(1);
    });
  });

  describe("project_repos lookup (cell membrane)", () => {
    test("findProjectsForKappa returns configured project_repos", () => {
      const { findProjectsForKappaForTest } = require("./soul-sync-helpers");
      const fleet = [
        { name: "08-mawjs", windows: [], project_repos: ["doctorboyz/maw-js"] },
        { name: "01-pulse", windows: [] },
      ];
      expect(findProjectsForKappaForTest("mawjs", fleet)).toEqual(["doctorboyz/maw-js"]);
      expect(findProjectsForKappaForTest("pulse", fleet)).toEqual([]);
      expect(findProjectsForKappaForTest("missing", fleet)).toEqual([]);
    });

    test("findKappaForProject returns owning kappa name", () => {
      const { findKappaForProjectForTest } = require("./soul-sync-helpers");
      const fleet = [
        { name: "08-mawjs", windows: [], project_repos: ["doctorboyz/maw-js"] },
        { name: "01-pulse", windows: [], project_repos: ["laris-co/floodboy", "laris-co/dustboy"] },
      ];
      expect(findKappaForProjectForTest("doctorboyz/maw-js", fleet)).toBe("mawjs");
      expect(findKappaForProjectForTest("laris-co/dustboy", fleet)).toBe("pulse");
      expect(findKappaForProjectForTest("nobody/orphan", fleet)).toBeNull();
    });

    test("resolveProjectSlug handles github.com-rooted ghqRoot (#193)", () => {
      const { resolveProjectSlug } = require("../src/commands/plugins/soul-sync/impl");
      const ghqRoot = "/home/neo/Code/github.com";
      expect(
        resolveProjectSlug("/home/neo/Code/github.com/doctorboyz/maw-js", ghqRoot)
      ).toBe("doctorboyz/maw-js");
    });

    test("resolveProjectSlug handles bare ghq root (#193 — was dropping repo segment)", () => {
      const { resolveProjectSlug } = require("../src/commands/plugins/soul-sync/impl");
      const ghqRoot = "/home/neo/Code";
      // Before the fix this returned "github.com/doctorboyz" (org-only) —
      // slice(0, 2) was grabbing [host, org] instead of [org, repo].
      expect(
        resolveProjectSlug("/home/neo/Code/github.com/doctorboyz/maw-js", ghqRoot)
      ).toBe("doctorboyz/maw-js");
    });

    test("resolveProjectSlug strips worktree suffix (#193)", () => {
      const { resolveProjectSlug } = require("../src/commands/plugins/soul-sync/impl");
      const ghqRoot = "/home/neo/Code/github.com";
      expect(
        resolveProjectSlug("/home/neo/Code/github.com/doctorboyz/maw-js.wt-issue-193", ghqRoot)
      ).toBe("doctorboyz/maw-js");
    });

    test("resolveProjectSlug returns null when repoRoot is outside ghqRoot (#193)", () => {
      const { resolveProjectSlug } = require("../src/commands/plugins/soul-sync/impl");
      expect(
        resolveProjectSlug("/tmp/somewhere-else", "/home/neo/Code/github.com")
      ).toBeNull();
    });

    test("resolveProjectSlug returns null when path has no repo segment (#193)", () => {
      const { resolveProjectSlug } = require("../src/commands/plugins/soul-sync/impl");
      // Sitting at the org directory, no repo to resolve.
      expect(
        resolveProjectSlug("/home/neo/Code/github.com/doctorboyz", "/home/neo/Code/github.com")
      ).toBeNull();
    });

    test("project ψ/ syncs into kappa ψ/ across all SYNC_DIRS, new files only", () => {
      // Build a fake project + kappa pair
      const PROJECT_PSI = join(TEST_DIR, "project-repo", "ψ");
      const KAPPA_PSI = join(TEST_DIR, "owner-kappa", "ψ");

      mkdirSync(join(PROJECT_PSI, "memory/learnings"), { recursive: true });
      mkdirSync(join(PROJECT_PSI, "memory/retrospectives/2026-04/07"), { recursive: true });
      mkdirSync(join(PROJECT_PSI, "memory/traces/2026-04-07"), { recursive: true });
      writeFileSync(join(PROJECT_PSI, "memory/learnings/git-is-transport.md"), "# git is the transport");
      writeFileSync(join(PROJECT_PSI, "memory/retrospectives/2026-04/07/17.26_yeast.md"), "# yeast");
      writeFileSync(join(PROJECT_PSI, "memory/traces/2026-04-07/1802_maw-wire.md"), "# trace");

      mkdirSync(join(KAPPA_PSI, "memory/learnings"), { recursive: true });
      // Pre-existing file in kappa that must NOT be overwritten
      writeFileSync(join(KAPPA_PSI, "memory/learnings/git-is-transport.md"), "# KAPPA VERSION");

      const { syncDirForTest } = require("./soul-sync-helpers");
      const SYNC_DIRS = ["memory/learnings", "memory/retrospectives", "memory/traces"];
      let total = 0;
      for (const d of SYNC_DIRS) {
        total += syncDirForTest(join(PROJECT_PSI, d), join(KAPPA_PSI, d));
      }

      // 2 new files copied (retro + trace); learning was pre-existing → skipped
      expect(total).toBe(2);
      expect(existsSync(join(KAPPA_PSI, "memory/retrospectives/2026-04/07/17.26_yeast.md"))).toBe(true);
      expect(existsSync(join(KAPPA_PSI, "memory/traces/2026-04-07/1802_maw-wire.md"))).toBe(true);
      expect(readFileSync(join(KAPPA_PSI, "memory/learnings/git-is-transport.md"), "utf-8")).toBe("# KAPPA VERSION");
    });
  });

  describe("findPeers (flat peer lookup)", () => {
    test("returns empty for kappa without sync_peers", () => {
      const { findPeersForTest } = require("./soul-sync-helpers");
      const fleet = [
        { name: "01-pulse", windows: [{ name: "pulse-kappa", repo: "laris-co/pulse-kappa" }] },
        { name: "06-floodboy", windows: [{ name: "floodboy-kappa", repo: "laris-co/floodboy-kappa" }] },
      ];
      expect(findPeersForTest("floodboy", fleet)).toEqual([]);
    });

    test("returns configured sync_peers", () => {
      const { findPeersForTest } = require("./soul-sync-helpers");
      const fleet = [
        { name: "06-floodboy", windows: [], sync_peers: ["pulse", "neo"] },
        { name: "01-pulse", windows: [], sync_peers: ["floodboy", "fireman"] },
      ];
      expect(findPeersForTest("floodboy", fleet)).toEqual(["pulse", "neo"]);
      expect(findPeersForTest("pulse", fleet)).toEqual(["floodboy", "fireman"]);
    });

    test("returns empty for kappa with empty sync_peers", () => {
      const { findPeersForTest } = require("./soul-sync-helpers");
      const fleet = [
        { name: "06-floodboy", windows: [], sync_peers: [] },
      ];
      expect(findPeersForTest("floodboy", fleet)).toEqual([]);
    });
  });

  // #363 phase 1 — canonical collaboration docs (treaty-class) must ride
  // through soul-sync so child kappas inherit them, not just learnings/
  // retros/traces. Regression guard against dropping the subdir.
  describe("collaborations propagation (#363 phase 1)", () => {
    test("parent's memory/collaborations/ propagates to bud via syncKappaVaults", () => {
      const { syncKappaVaults } = require("../src/commands/plugins/soul-sync/sync-helpers");

      const budRoot = join(TEST_DIR, "bud-kappa");
      const parentRoot = join(TEST_DIR, "mawjs-kappa");
      const parentCollab = join(parentRoot, "ψ/memory/collaborations/white-wormhole/topics");

      mkdirSync(parentCollab, { recursive: true });
      writeFileSync(
        join(parentCollab, "claim-chain-and-sync-protocol.md"),
        "# ACCEPT primitive — 11 ratified agreements",
      );
      mkdirSync(budRoot, { recursive: true });

      const result = syncKappaVaults(parentRoot, budRoot, "mawjs", "bud");

      const budFile = join(budRoot, "ψ/memory/collaborations/white-wormhole/topics/claim-chain-and-sync-protocol.md");
      expect(existsSync(budFile)).toBe(true);
      expect(readFileSync(budFile, "utf-8")).toContain("ACCEPT primitive");
      expect(result.synced["memory/collaborations"]).toBe(1);
      expect(result.total).toBe(1);
    });

    test("collaborations sync skips files already present in bud (new-files-only)", () => {
      const { syncKappaVaults } = require("../src/commands/plugins/soul-sync/sync-helpers");

      const budRoot = join(TEST_DIR, "bud-kappa");
      const parentRoot = join(TEST_DIR, "mawjs-kappa");
      const parentCollab = join(parentRoot, "ψ/memory/collaborations/peer-x/topics");
      const budCollab = join(budRoot, "ψ/memory/collaborations/peer-x/topics");

      mkdirSync(parentCollab, { recursive: true });
      mkdirSync(budCollab, { recursive: true });
      writeFileSync(join(parentCollab, "treaty.md"), "# PARENT TREATY");
      writeFileSync(join(budCollab, "treaty.md"), "# BUD-LOCAL EDIT — must not be overwritten");

      const result = syncKappaVaults(parentRoot, budRoot, "mawjs", "bud");

      expect(readFileSync(join(budCollab, "treaty.md"), "utf-8")).toContain("BUD-LOCAL EDIT");
      expect(result.total).toBe(0);
    });

    test("no memory/collaborations on parent → bud sync is a no-op (no error)", () => {
      const { syncKappaVaults } = require("../src/commands/plugins/soul-sync/sync-helpers");

      const budRoot = join(TEST_DIR, "bud-kappa");
      const parentRoot = join(TEST_DIR, "mawjs-kappa");
      mkdirSync(join(parentRoot, "ψ/memory/learnings"), { recursive: true });
      mkdirSync(budRoot, { recursive: true });

      const result = syncKappaVaults(parentRoot, budRoot, "mawjs", "bud");

      expect(existsSync(join(budRoot, "ψ/memory/collaborations"))).toBe(false);
      expect(result.synced["memory/collaborations"]).toBeUndefined();
    });
  });
});
