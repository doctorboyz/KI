import { describe, test, expect } from "bun:test";
import { normalizeTarget } from "../../../src/core/matcher/normalize-target";

describe("normalizeTarget", () => {
  test("plain name passes through unchanged", () => {
    expect(normalizeTarget("token-kappa")).toBe("token-kappa");
  });

  test("single trailing slash is stripped", () => {
    // The repro case for #342: tab-completed `token-kappa/` must resolve.
    expect(normalizeTarget("token-kappa/")).toBe("token-kappa");
  });

  test("multiple trailing slashes are stripped", () => {
    expect(normalizeTarget("token-kappa//")).toBe("token-kappa");
  });

  test("trailing /.git is stripped", () => {
    expect(normalizeTarget("token-kappa/.git")).toBe("token-kappa");
  });

  test("trailing /.git/ is stripped (both the suffix and the slash)", () => {
    expect(normalizeTarget("token-kappa/.git/")).toBe("token-kappa");
  });

  test("empty string stays empty (caller surfaces usage error)", () => {
    expect(normalizeTarget("")).toBe("");
  });
});
