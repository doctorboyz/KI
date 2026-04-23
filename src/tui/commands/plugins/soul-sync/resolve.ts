import { existsSync } from "fs";
import { join } from "path";
import { ghqFind } from "../../../../core/ghq";
import { loadConfig } from "../../../../core/config";
import { loadFleet } from "../../shared/fleet-load";

/**
 * Resolve ghq path for an kappa name.
 * Tries: ghqFind(`/<stem>-kappa$`) — case-insensitive ghq lookup.
 *
 * Defensive — accepts both bare kappa name ("neo") and full repo name
 * ("neo-kappa"). Strips trailing "-kappa" before re-appending so callers
 * passing either form land on the same lookup. (#372)
 */
export async function resolveKappaPath(name: string): Promise<string | null> {
  // Strip trailing -kappa so "neo" and "neo-kappa" both resolve identically.
  const stem = name.replace(/-kappa$/, "");
  const out = await ghqFind(`/${stem}-kappa$`);
  if (out) return out;

  // Fallback: check fleet config for repo path
  const ghqRoot = loadConfig().ghqRoot;
  const fleet = loadFleet();
  for (const sess of fleet) {
    const kappaName = sess.name.replace(/^\d+-/, "");
    if (kappaName === stem && sess.windows.length > 0) {
      const repoPath = join(ghqRoot, sess.windows[0].repo);
      if (existsSync(repoPath)) return repoPath;
    }
  }

  return null;
}

/**
 * Resolve a git repo path to its canonical "org/repo" slug for `project_repos`
 * lookup. Handles both shapes of `ghqRoot`:
 *
 *   A. github.com-rooted: `/home/neo/Code/github.com`
 *      repoRoot = `/home/neo/Code/github.com/doctorboyz/ki`
 *      → rel = `doctorboyz/ki` → slug = `doctorboyz/ki`
 *
 *   B. bare ghq root:     `/home/neo/Code`
 *      repoRoot = `/home/neo/Code/github.com/doctorboyz/ki`
 *      → rel = `github.com/doctorboyz/ki` → (strip host) →
 *        `doctorboyz/ki` → slug = `doctorboyz/ki`
 *
 * Before this normalization, shape B produced the org-only slug
 * `github.com/doctorboyz` because `.split("/").slice(0, 2)` grabbed
 * the host + org instead of org + repo. See #193.
 *
 * Worktree suffix (`.wt-*`) is stripped from the repo segment so worktrees
 * match their parent repo's `project_repos` entry.
 *
 * Returns null if `repoRoot` is not under `ghqRoot` or doesn't have the
 * expected depth (e.g. sitting directly under ghqRoot with no org segment).
 */
export function resolveProjectSlug(repoRoot: string, ghqRoot: string): string | null {
  if (!repoRoot.startsWith(ghqRoot)) return null;
  let rel = repoRoot.slice(ghqRoot.length).replace(/^\/+/, "");
  // If ghqRoot is the bare ghq root (not github.com-rooted), rel starts with
  // a host segment — strip known forges so we always land at "<org>/<repo>".
  rel = rel.replace(/^(github\.com|gitlab\.com|bitbucket\.org)\//, "");
  const parts = rel.split("/").slice(0, 2);
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  parts[1] = parts[1].replace(/\.wt-.*$/, "");
  return parts.join("/");
}

/**
 * Find the kappa that owns a given project repo (org/repo slug).
 */
export function findKappaForProject(projectRepo: string): string | null {
  const fleet = loadFleet();
  for (const sess of fleet) {
    if (sess.project_repos?.includes(projectRepo)) {
      return sess.name.replace(/^\d+-/, "");
    }
  }
  return null;
}
