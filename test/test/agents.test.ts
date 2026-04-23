import { describe, test, expect } from "bun:test";
import { buildAgentRows, type AgentRow } from "../src/commands/shared/agents";

// buildAgentRows is pure — no tmux, no I/O needed.

function makeWindowNames(entries: Array<[string, string]>): Map<string, string> {
  return new Map(entries);
}

describe("buildAgentRows — kappa detection", () => {
  test("kappa window is included and kappa name is extracted", () => {
    const panes = [{ command: "claude", target: "01-mawjs:0.0", pid: 1234 }];
    const wn = makeWindowNames([["01-mawjs:0", "mawjs-kappa"]]);
    const rows = buildAgentRows(panes, wn, "kappa-world");
    expect(rows).toHaveLength(1);
    expect(rows[0].kappa).toBe("mawjs");
    expect(rows[0].window).toBe("mawjs-kappa");
    expect(rows[0].session).toBe("01-mawjs");
    expect(rows[0].node).toBe("kappa-world");
    expect(rows[0].pid).toBe(1234);
  });

  test("non-kappa window is excluded by default", () => {
    const panes = [{ command: "zsh", target: "01-mawjs:1.0", pid: 5678 }];
    const wn = makeWindowNames([["01-mawjs:1", "shell"]]);
    const rows = buildAgentRows(panes, wn, "kappa-world");
    expect(rows).toHaveLength(0);
  });

  test("non-kappa window is included with --all", () => {
    const panes = [{ command: "zsh", target: "01-mawjs:1.0", pid: 5678 }];
    const wn = makeWindowNames([["01-mawjs:1", "shell"]]);
    const rows = buildAgentRows(panes, wn, "kappa-world", { all: true });
    expect(rows).toHaveLength(1);
    expect(rows[0].kappa).toBe("");
    expect(rows[0].window).toBe("shell");
  });
});

describe("buildAgentRows — state detection", () => {
  test("shell command produces idle state", () => {
    const panes = [{ command: "zsh", target: "02-neo:0.0", pid: 999 }];
    const wn = makeWindowNames([["02-neo:0", "neo-kappa"]]);
    const rows = buildAgentRows(panes, wn, "kappa-world");
    expect(rows[0].state).toBe("idle");
  });

  test("non-shell command produces active state", () => {
    const panes = [{ command: "claude", target: "02-neo:0.0", pid: 888 }];
    const wn = makeWindowNames([["02-neo:0", "neo-kappa"]]);
    const rows = buildAgentRows(panes, wn, "kappa-world");
    expect(rows[0].state).toBe("active");
  });

  test("multiple panes: mix of kappa and non-kappa, mix of states", () => {
    const panes = [
      { command: "claude", target: "01-mawjs:0.0", pid: 100 },
      { command: "zsh",    target: "02-neo:0.0",   pid: 200 },
      { command: "bash",   target: "03-shell:0.0", pid: 300 }, // non-kappa
    ];
    const wn = makeWindowNames([
      ["01-mawjs:0", "mawjs-kappa"],
      ["02-neo:0",   "neo-kappa"],
      ["03-shell:0", "shell"],
    ]);
    const rows = buildAgentRows(panes, wn, "kappa-world");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ kappa: "mawjs", state: "active", pid: 100 });
    expect(rows[1]).toMatchObject({ kappa: "neo", state: "idle", pid: 200 });
  });
});
