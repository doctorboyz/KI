/**
 * Runtime guard: bud stem must NOT end with '-kappa'.
 *
 * The bud plugin auto-appends '-kappa' to produce the repo name, so a stem
 * like 'arra-kappa-v3-kappa' would create 'arra-kappa-v3-kappa-kappa'.
 * The guard throws before any filesystem/git side effects.
 */
import { describe, test, expect } from "bun:test";
import { cmdBud } from "../src/commands/plugins/bud/impl";

describe("bud stem runtime guard", () => {
  test("throws on stem ending with -kappa", async () => {
    await expect(cmdBud("arra-kappa-v3-kappa", {})).rejects.toThrow(
      /must NOT end with '-kappa'/,
    );
  });

  test("throws on single -kappa suffix", async () => {
    await expect(cmdBud("my-kappa", {})).rejects.toThrow(
      /must NOT end with '-kappa'/,
    );
  });

  test("accepts stem without -kappa suffix", async () => {
    // Guard must NOT fire — actual bud flow may fail for other reasons, that's fine
    try {
      await cmdBud("test-stem-only", {});
    } catch (e: any) {
      expect(e.message).not.toMatch(/must NOT end with '-kappa'/);
    }
  });
});
