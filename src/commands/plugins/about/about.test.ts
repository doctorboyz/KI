import { describe, it, expect, mock } from "bun:test";
import { join } from "path";
import type { InvokeContext } from "../../../plugin/types";

const root = join(import.meta.dir, "../../..");

mock.module(join(root, "commands/plugins/kappa/impl"), () => ({
  cmdKappaAbout: async (kappa: string) => {
    console.log(`Kappa — ${kappa}`);
    console.log(`  Repo:      /home/neo/ghq/github.com/doctorboyz/${kappa}-kappa`);
    console.log(`  Session:   ${kappa}`);
  },
}));

const { default: handler } = await import("./index");

describe("about plugin", () => {
  it("CLI — shows info for named kappa", async () => {
    const ctx: InvokeContext = { source: "cli", args: ["neo"] };
    const result = await handler(ctx);
    expect(result.ok).toBe(true);
    expect(result.output).toContain("Kappa — neo");
  });

  it("CLI — missing kappa returns error", async () => {
    const ctx: InvokeContext = { source: "cli", args: [] };
    const result = await handler(ctx);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("usage");
  });

  it("API — kappa param shows info", async () => {
    const ctx: InvokeContext = { source: "api", args: { kappa: "white" } };
    const result = await handler(ctx);
    expect(result.ok).toBe(true);
    expect(result.output).toContain("Kappa — white");
  });

  it("API — missing kappa returns error", async () => {
    const ctx: InvokeContext = { source: "api", args: {} };
    const result = await handler(ctx);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("kappa is required");
  });
});
