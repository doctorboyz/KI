import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { InvokeContext } from "../../../../plugin/types";

mock.module("./impl", () => ({
  cmdKappaList: async () => {
    console.log("Kappa Fleet  (1/2 awake)");
  },
  cmdKappaScan: async (_opts: any) => {
    console.log("Scanned 5 kappas locally");
  },
  cmdKappaScanStale: async (_opts: any) => {
    console.log("Stale kappa scan  (DEAD 1  STALE 2)");
  },
  cmdKappaFleet: async (_opts: any) => {
    console.log("Kappa Fleet  (5 kappas)");
  },
  cmdKappaAbout: async (name: string) => {
    console.log(`Kappa — ${name}`);
  },
}));

describe("kappa plugin", () => {
  let handler: (ctx: InvokeContext) => Promise<any>;

  beforeEach(async () => {
    const mod = await import("./index");
    handler = mod.default;
  });

  it("cli: ls lists kappas", async () => {
    const result = await handler({ source: "cli", args: ["ls"] });
    expect(result.ok).toBe(true);
    expect(result.output).toContain("Kappa Fleet");
  });

  it("cli: scan runs kappa scan", async () => {
    const result = await handler({ source: "cli", args: ["scan"] });
    expect(result.ok).toBe(true);
    expect(result.output).toContain("Scanned");
  });

  it("cli: scan --stale dispatches to stale classifier", async () => {
    const result = await handler({ source: "cli", args: ["scan", "--stale"] });
    expect(result.ok).toBe(true);
    expect(result.output).toContain("Stale kappa scan");
  });

  it("cli: fleet shows fleet", async () => {
    const result = await handler({ source: "cli", args: ["fleet"] });
    expect(result.ok).toBe(true);
    expect(result.output).toContain("Kappa Fleet");
  });

  it("cli: about <name> shows kappa details", async () => {
    const result = await handler({ source: "cli", args: ["about", "neo"] });
    expect(result.ok).toBe(true);
    expect(result.output).toContain("Kappa — neo");
  });

  // Behavior #7: fleet deprecation alias
  // After redesign: `ki kappa fleet` shows a deprecation warning and delegates to ls.
  // Both the warning AND "Kappa Fleet" (from cmdKappaList mock) should appear in output.
  // Will fail until kappa-ls-impl ships the dispatcher change. -- alpha.53
  it("cli: fleet → deprecation warning appears alongside ls output", async () => {
    const result = await handler({ source: "cli", args: ["fleet"] });
    expect(result.ok).toBe(true);
    // Kappa Fleet still appears (from cmdKappaList being called)
    expect(result.output).toContain("Kappa Fleet");
    // Deprecation notice is emitted (console.error captured in output)
    expect(result.output).toMatch(/deprecat|alias|use.*ls|fleet.*ls/i);
  });
});
