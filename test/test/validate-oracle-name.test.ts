/**
 * Regression tests for #358 — kappa names ending in `-view` must be rejected
 * at user-input boundaries (bud, wake, awaken) so that `foo-view-view` chains
 * and session-resolution ambiguity can never exist in the first place.
 *
 * Fix: src/core/fleet/validate.ts exports `assertValidKappaName(name)` —
 *      throws with a helpful message that suggests dropping the `-view`
 *      suffix. The view/impl.ts `-view-view` filter stays as cruft-handler
 *      for any pre-existing sessions, but new creation paths must enforce.
 */
import { describe, it, expect } from "bun:test";
import { assertValidKappaName } from "../src/core/fleet/validate";

describe("#358 — assertValidKappaName rejects `-view` suffix", () => {
  it("rejects `foo-view` with a message suggesting `foo`", () => {
    expect(() => assertValidKappaName("foo-view")).toThrow(/-view/);
    try {
      assertValidKappaName("foo-view");
      throw new Error("expected assertValidKappaName to throw");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain("-view");
      expect(msg).toContain("'foo'"); // suggestion text
    }
  });

  it("rejects `mawjs-view`", () => {
    expect(() => assertValidKappaName("mawjs-view")).toThrow();
  });

  it("accepts bare `foo`", () => {
    expect(() => assertValidKappaName("foo")).not.toThrow();
  });

  it("accepts `mawjs-neo`", () => {
    expect(() => assertValidKappaName("mawjs-neo")).not.toThrow();
  });

  it("accepts `view-foo` — `view` as prefix is fine, only suffix is reserved", () => {
    expect(() => assertValidKappaName("view-foo")).not.toThrow();
  });

  it("rejects `multi-word-kappa-view` — the suffix rule applies regardless of name length", () => {
    expect(() => assertValidKappaName("multi-word-kappa-view")).toThrow(/-view/);
  });
});
