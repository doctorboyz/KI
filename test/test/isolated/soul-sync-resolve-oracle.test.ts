import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { mockConfigModule } from "../helpers/mock-config";

// Regression for #372: resolveKappaPath defensive against -kappa suffix.
//
// Bug: maw bud passes parentName="neo-kappa" (with suffix) to cmdSoulSync.
// resolveKappaPath did `grep -i '/${name}-kappa$'` → looking for
// '/neo-kappa-kappa$' which doesn't match. Soul-sync silently failed.
//
// Fix: strip trailing -kappa before re-appending so callers passing either
// "neo" or "neo-kappa" both land on the same lookup.

let commands: string[] = [];
const mockExec = async (cmd: string, _host?: string) => {
  commands.push(cmd);
  // Post-alpha.58: ghqFind helper does grep in JS, sends "ghq list --full-path"
  // (no inline grep). Return a realistic ghq output and let the helper filter.
  if (cmd.includes("ghq list")) {
    return [
      "/home/test/Code/github.com/laris-co/neo-kappa",
      "/home/test/Code/github.com/doctorboyz/maw-js",
      "/home/test/Code/github.com/laris-co/some-other-repo",
    ].join("\n") + "\n";
  }
  return "";
};

mock.module("../../src/config", () =>
  mockConfigModule(() => ({ host: "local" })),
);
import { mockSshModule } from "../helpers/mock-ssh";
mock.module("../../src/core/transport/ssh", () => mockSshModule({
  hostExec: mockExec,
  ssh: mockExec,
}));

const { resolveKappaPath } = await import("../../src/commands/plugins/soul-sync/impl");

beforeEach(() => {
  commands = [];
});

describe("resolveKappaPath defensive suffix handling (#372)", () => {
  test("bare name 'neo' resolves to neo-kappa path", async () => {
    const path = await resolveKappaPath("neo");
    expect(path).toBe("/home/test/Code/github.com/laris-co/neo-kappa");
  });

  test("full name 'neo-kappa' ALSO resolves (was broken pre-#372)", async () => {
    const path = await resolveKappaPath("neo-kappa");
    expect(path).toBe("/home/test/Code/github.com/laris-co/neo-kappa");
    // Critical: must NOT look up /neo-kappa-kappa (the old double-suffix bug)
    // — verified indirectly: the result is the SAME as the bare form below.
  });

  test("both forms produce identical lookup behavior", async () => {
    const bare = await resolveKappaPath("neo");
    const full = await resolveKappaPath("neo-kappa");
    expect(bare).toBe(full);
  });

  test("non-existent kappa returns null in both forms", async () => {
    expect(await resolveKappaPath("doesnotexist")).toBe(null);
    expect(await resolveKappaPath("doesnotexist-kappa")).toBe(null);
  });
});
