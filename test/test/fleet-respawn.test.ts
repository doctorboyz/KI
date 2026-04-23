import { describe, test, expect } from "bun:test";
import { respawnBuggy, respawnFixed } from "./fleet-respawn-logic";

/**
 * Reproduction test for duplicate window bug in respawnMissingWorktrees().
 *
 * Bug: fleet config has clean names ("neo-maw-js"), worktrees have numbered
 * prefixes ("wt-3-maw-js"). Collision fallback renames to "neo-3-maw-js"
 * which bypasses dedup → duplicate window for every worktree.
 */

// Exact state from neo after reboot
const NEO_FLEET = [
  "neo-kappa", "neo-kappa-skills-cli", "neo-maw-js", "neo-arra-kappa-v3",
  "neo-arra-symbiosis-skills", "neo-hellodemo2", "neo-kappa-stun", "neo-web3-mqtt",
  "neo-test-wt", "neo-mqtt-feed", "neo-kappanet-skill", "neo-kappanet",
  "neo-vision-counter", "neo-gm", "neo-maw-ui",
];

const NEO_WORKTREES = [
  "2-kappa-skills-cli", "3-maw-js", "4-arra-kappa-v3",
  "5-arra-symbiosis-skills", "6-hellodemo2", "7-kappa-stun",
  "8-web3-mqtt", "9-test-wt", "10-mqtt-feed", "11-kappanet-skill",
  "12-kappanet", "13-vision-counter", "14-mycelium-network-kappa",
  "15-gm", "16-maw-ui",
];

describe("respawn dedup — bug reproduction", () => {
  test("buggy: all 15 worktrees create duplicates", () => {
    const result = respawnBuggy({
      kappaName: "neo",
      registeredNames: new Set(NEO_FLEET),
      runningWindows: [...NEO_FLEET],
      worktreeSuffixes: NEO_WORKTREES,
    });

    expect(result.created.length).toBe(15);
    expect(result.skipped.length).toBe(0);
    expect(result.created).toContain("neo-3-maw-js");
    expect(result.created).toContain("neo-10-mqtt-feed");
  });

  test("buggy: single worktree traces the rename→bypass path", () => {
    const result = respawnBuggy({
      kappaName: "neo",
      registeredNames: new Set(["neo-maw-js"]),
      runningWindows: ["neo-maw-js"],
      worktreeSuffixes: ["3-maw-js"],
    });

    expect(result.created).toEqual(["neo-3-maw-js"]);
  });
});

describe("respawn dedup — fix verification", () => {
  test("covered worktrees skipped, only genuinely new ones created", () => {
    const result = respawnFixed({
      kappaName: "neo",
      registeredNames: new Set(NEO_FLEET),
      runningWindows: [...NEO_FLEET],
      worktreeSuffixes: NEO_WORKTREES,
    });

    // 14 covered, 1 genuinely new (mycelium-network-kappa not in fleet config)
    expect(result.created).toEqual(["neo-mycelium-network-kappa"]);
    expect(result.skipped.length).toBe(14);
  });

  test("new worktree not in fleet config IS created", () => {
    const result = respawnFixed({
      kappaName: "neo",
      registeredNames: new Set(["neo-kappa"]),
      runningWindows: ["neo-kappa"],
      worktreeSuffixes: ["3-maw-js"],
    });

    expect(result.created).toEqual(["neo-maw-js"]);
  });

  test("true collision between two worktrees uses numbered fallback", () => {
    const result = respawnFixed({
      kappaName: "neo",
      registeredNames: new Set(["neo-kappa"]),
      runningWindows: ["neo-kappa"],
      worktreeSuffixes: ["1-mqtt", "2-mqtt"],
    });

    expect(result.created).toContain("neo-mqtt");
    expect(result.created).toContain("neo-2-mqtt");
    expect(result.created.length).toBe(2);
  });

  test("single covered worktree is skipped", () => {
    const result = respawnFixed({
      kappaName: "neo",
      registeredNames: new Set(["neo-maw-js"]),
      runningWindows: ["neo-maw-js"],
      worktreeSuffixes: ["3-maw-js"],
    });

    expect(result.created).toEqual([]);
    expect(result.skipped).toEqual(["3-maw-js"]);
  });
});

describe("respawn dedup — edge cases", () => {
  test("empty worktree list", () => {
    const result = respawnFixed({
      kappaName: "neo",
      registeredNames: new Set(NEO_FLEET),
      runningWindows: [...NEO_FLEET],
      worktreeSuffixes: [],
    });

    expect(result.created.length).toBe(0);
  });

  test("worktree with no number prefix", () => {
    const result = respawnFixed({
      kappaName: "neo",
      registeredNames: new Set(["neo-kappa"]),
      runningWindows: ["neo-kappa"],
      worktreeSuffixes: ["freelance"],
    });

    expect(result.created).toEqual(["neo-freelance"]);
  });

  test("running but unregistered window is still skipped", () => {
    const result = respawnFixed({
      kappaName: "neo",
      registeredNames: new Set(["neo-kappa"]),
      runningWindows: ["neo-kappa", "neo-maw-js"],
      worktreeSuffixes: ["3-maw-js"],
    });

    expect(result.created).toEqual([]);
    expect(result.skipped).toEqual(["3-maw-js"]);
  });
});
