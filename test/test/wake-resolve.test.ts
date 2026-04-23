/**
 * Tests for resolveFromWorktrees — the worktree fallback in resolveKappa.
 *
 * When ghq doesn't know about an kappa (e.g. on a machine where ghq isn't
 * configured or the ghq root was moved), but `maw ls` can see a worktree for
 * it, `maw wake` should still work. Nat's insight: "if we have a worktree we
 * have a git repo for sure."
 *
 * We test resolveFromWorktrees directly with injected deps (no module mocking)
 * following the same pattern as wake.test.ts.
 */
import { describe, test, expect } from "bun:test";
import { resolveFromWorktrees } from "../src/commands/shared/wake-resolve-impl";
import type { WorktreeInfo } from "../src/core/fleet/worktrees-scan";

const MAIN_PATH = "/home/user/ghq/github.com/doctorboyz/wireboy-kappa";
const GIT_COMMON = `${MAIN_PATH}/.git`;

const orphanWorktree: WorktreeInfo = {
  path: `${MAIN_PATH}.wt-1-jera-pagination-srakaew`,
  branch: "(prunable)",
  repo: "github.com/doctorboyz/wireboy-kappa.wt-1-jera-pagination-srakaew",
  mainRepo: "github.com/doctorboyz/wireboy-kappa",
  name: "1-jera-pagination-srakaew",
  status: "orphan",
};

const execGitCommon = async (cmd: string) => {
  if (cmd.includes("rev-parse --git-common-dir")) return GIT_COMMON;
  return "";
};

describe("resolveFromWorktrees — worktree fallback", () => {
  test("resolves kappa when worktree exists and main repo is on disk", async () => {
    const result = await resolveFromWorktrees(
      "wireboy",
      async () => [orphanWorktree],
      execGitCommon,
      (p) => p === MAIN_PATH,
    );

    expect(result).not.toBeNull();
    expect(result!.repoPath).toBe(MAIN_PATH);
    expect(result!.repoName).toBe("wireboy-kappa");
    expect(result!.parentDir).toBe("/home/user/ghq/github.com/doctorboyz");
  });

  test("returns null when no worktree matches the kappa name", async () => {
    const result = await resolveFromWorktrees(
      "notexist",
      async () => [orphanWorktree],
      execGitCommon,
      () => true,
    );
    expect(result).toBeNull();
  });

  test("returns null when main repo has been deleted from disk", async () => {
    const result = await resolveFromWorktrees(
      "wireboy",
      async () => [orphanWorktree],
      execGitCommon,
      () => false, // existsFn always false — repo deleted
    );
    expect(result).toBeNull();
  });

  test("returns null when git rev-parse returns empty (corrupt worktree)", async () => {
    const result = await resolveFromWorktrees(
      "wireboy",
      async () => [orphanWorktree],
      async () => "", // empty git output
      () => true,
    );
    expect(result).toBeNull();
  });

  test("handles active worktree (not just orphan) equally", async () => {
    const active: WorktreeInfo = {
      ...orphanWorktree,
      status: "active",
      tmuxWindow: "wireboy-kappa",
    };
    const result = await resolveFromWorktrees(
      "wireboy",
      async () => [active],
      execGitCommon,
      (p) => p === MAIN_PATH,
    );
    expect(result).not.toBeNull();
    expect(result!.repoPath).toBe(MAIN_PATH);
  });

  test("picks the correct kappa when multiple worktrees are present", async () => {
    const otherWorktree: WorktreeInfo = {
      path: "/home/user/ghq/github.com/doctorboyz/neo-kappa.wt-1-feature",
      branch: "main",
      repo: "github.com/doctorboyz/neo-kappa.wt-1-feature",
      mainRepo: "github.com/doctorboyz/neo-kappa",
      name: "1-feature",
      status: "stale",
    };

    const result = await resolveFromWorktrees(
      "wireboy",
      async () => [otherWorktree, orphanWorktree],
      async (cmd) => {
        // Only wireboy worktree should be queried
        if (cmd.includes(orphanWorktree.path) && cmd.includes("rev-parse --git-common-dir")) {
          return GIT_COMMON;
        }
        return "";
      },
      (p) => p === MAIN_PATH,
    );

    expect(result).not.toBeNull();
    expect(result!.repoName).toBe("wireboy-kappa");
  });

  test("returns null for empty worktree list", async () => {
    const result = await resolveFromWorktrees(
      "wireboy",
      async () => [],
      execGitCommon,
      () => true,
    );
    expect(result).toBeNull();
  });
});
