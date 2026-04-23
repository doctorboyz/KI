import { describe, test, expect } from "bun:test";
import { parseWakeTarget } from "../src/commands/shared/wake-target";

describe("parseWakeTarget — GitHub URLs", () => {
  test("basic HTTPS URL", () => {
    const r = parseWakeTarget("https://github.com/org/repo");
    expect(r).toEqual({ kappa: "repo", slug: "org/repo" });
  });

  test("strips -kappa suffix from kappa name", () => {
    const r = parseWakeTarget("https://github.com/org/repo-kappa");
    expect(r).toEqual({ kappa: "repo", slug: "org/repo-kappa" });
  });

  test("strips .git suffix", () => {
    const r = parseWakeTarget("https://github.com/org/repo.git");
    expect(r).toEqual({ kappa: "repo", slug: "org/repo" });
  });

  test("HTTP without TLS", () => {
    const r = parseWakeTarget("http://github.com/org/repo");
    expect(r).toEqual({ kappa: "repo", slug: "org/repo" });
  });

  test("git@ SSH with .git", () => {
    const r = parseWakeTarget("git@github.com:org/repo.git");
    expect(r).toEqual({ kappa: "repo", slug: "org/repo" });
  });

  test("git@ SSH without .git", () => {
    const r = parseWakeTarget("git@github.com:org/repo");
    expect(r).toEqual({ kappa: "repo", slug: "org/repo" });
  });

  test("extracts issue number from URL", () => {
    const r = parseWakeTarget("https://github.com/org/repo/issues/42");
    expect(r).toEqual({ kappa: "repo", slug: "org/repo", issueNum: 42 });
  });

  test("extracts issue number and strips -kappa suffix", () => {
    const r = parseWakeTarget("https://github.com/org/repo-kappa/issues/7");
    expect(r).toEqual({ kappa: "repo", slug: "org/repo-kappa", issueNum: 7 });
  });

  test("trailing slash is ignored", () => {
    const r = parseWakeTarget("https://github.com/org/repo/");
    expect(r).toEqual({ kappa: "repo", slug: "org/repo" });
  });

  test("real-world long org name with -kappa repo (Nat's use case)", () => {
    const r = parseWakeTarget("https://github.com/the-kappa-keeps-the-human-human/graph-kappa");
    expect(r).toEqual({ kappa: "graph", slug: "the-kappa-keeps-the-human-human/graph-kappa" });
  });
});

describe("parseWakeTarget — org/repo slugs", () => {
  test("doctorboyz/mawjs-kappa → kappa 'mawjs', slug preserved", () => {
    const r = parseWakeTarget("doctorboyz/mawjs-kappa");
    expect(r).not.toBeNull();
    expect(r!.kappa).toBe("mawjs");
    expect(r!.slug).toBe("doctorboyz/mawjs-kappa");
    expect(r!.issueNum).toBeUndefined();
  });

  test("acme/my-project → kappa 'my-project' (no -kappa suffix)", () => {
    const r = parseWakeTarget("acme/my-project");
    expect(r).not.toBeNull();
    expect(r!.kappa).toBe("my-project");
    expect(r!.slug).toBe("acme/my-project");
  });

  test("acme/my-project.git → strips .git suffix", () => {
    const r = parseWakeTarget("acme/my-project.git");
    expect(r).not.toBeNull();
    expect(r!.kappa).toBe("my-project");
    expect(r!.slug).toBe("acme/my-project");
  });

  test("long org name with -kappa suffix stripped (Nat's real case)", () => {
    const r = parseWakeTarget("the-kappa-keeps-the-human-human/graph-kappa");
    expect(r).not.toBeNull();
    expect(r!.kappa).toBe("graph");
    expect(r!.slug).toBe("the-kappa-keeps-the-human-human/graph-kappa");
  });

  test("leading/trailing whitespace is trimmed", () => {
    const r = parseWakeTarget("  doctorboyz/mawjs-kappa  ");
    expect(r).not.toBeNull();
    expect(r!.kappa).toBe("mawjs");
    expect(r!.slug).toBe("doctorboyz/mawjs-kappa");
  });
});

describe("parseWakeTarget — null returns (plain kappa names)", () => {
  test("bare name 'neo' → null", () => {
    expect(parseWakeTarget("neo")).toBeNull();
  });

  test("hyphenated bare name 'maw-js' → null", () => {
    expect(parseWakeTarget("maw-js")).toBeNull();
  });

  test("keyword 'all' → null", () => {
    expect(parseWakeTarget("all")).toBeNull();
  });

  test("multi-segment path 'a/b/c' → null (not a valid slug)", () => {
    expect(parseWakeTarget("a/b/c")).toBeNull();
  });

  test("absolute path '/home/user/repo' → null", () => {
    expect(parseWakeTarget("/home/user/repo")).toBeNull();
  });

  test("flag-like arg '--flag' → null", () => {
    expect(parseWakeTarget("--flag")).toBeNull();
  });

  test("empty string → null", () => {
    expect(parseWakeTarget("")).toBeNull();
  });
});
