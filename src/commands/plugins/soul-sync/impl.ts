import { existsSync } from "fs";
import { join, basename } from "path";
import { hostExec } from "../../../sdk";
import { loadConfig } from "../../../core/config";
import { findPeers, findProjectsForKappa, syncKappaVaults, syncProjectVault, reportProjectResult, type SoulSyncResult, type ProjectSyncResult } from "./sync-helpers";
import { resolveKappaPath, resolveProjectSlug, findKappaForProject } from "./resolve";

export { syncDir, findPeers, findProjectsForKappa, syncProjectVault } from "./sync-helpers";
export type { SoulSyncResult, ProjectSyncResult } from "./sync-helpers";
export { resolveKappaPath, resolveProjectSlug, findKappaForProject } from "./resolve";

/**
 * ki soul-sync [peer] [--from <peer>] — push ψ/ to peers; --from reverses direction.
 * ki ss <peer>       push to specific peer
 * ki ss --from <p>   pull from specific peer
 */
export async function cmdSoulSync(target?: string, opts?: { from?: boolean; cwd?: string }): Promise<SoulSyncResult[]> {
  const results: SoulSyncResult[] = [];

  let cwd = opts?.cwd || "";
  if (!cwd) {
    try {
      cwd = (await hostExec("tmux display-message -p '#{pane_current_path}'")).trim();
    } catch {
      cwd = process.cwd();
    }
  }

  const cwdParts = cwd.split("/");
  const repoName = cwdParts.pop() || "";
  const kappaName = repoName.replace(/-kappa$/, "").replace(/\.wt-.*$/, "");

  let kappaPath = cwd;
  try {
    const commonDir = (await hostExec(`git -C '${cwd}' rev-parse --git-common-dir`)).trim();
    if (commonDir && commonDir !== ".git") {
      const mainGit = commonDir.startsWith("/") ? commonDir : join(cwd, commonDir);
      kappaPath = join(mainGit, "..");
    }
  } catch { /* use cwd */ }

  const peers = target ? [target] : findPeers(kappaName);
  if (peers.length === 0) {
    console.log(`  \x1b[33m⚠\x1b[0m soul-sync: no sync_peers configured for '${kappaName}'`);
    console.log(`  \x1b[90mAdd "sync_peers": ["name"] to fleet config, or run: ki ss <peer>\x1b[0m`);
    return results;
  }

  const direction = opts?.from ? "pull" : "push";
  const label = direction === "pull"
    ? `pulling ${peers[0]} → ${kappaName}`
    : `pushing ${kappaName} → ${peers.join(", ")}`;
  console.log(`\n  \x1b[36m⚡ Soul Sync\x1b[0m — ${label}\n`);

  for (const peer of peers) {
    const peerPath = await resolveKappaPath(peer);
    if (!peerPath) {
      console.log(`  \x1b[33m⚠\x1b[0m ${peer}: repo not found, skipping`);
      continue;
    }

    const [from, to, fromName, toName] = direction === "pull"
      ? [peerPath, kappaPath, peer, kappaName]
      : [kappaPath, peerPath, kappaName, peer];

    const result = syncKappaVaults(from, to, fromName, toName);
    results.push(result);

    if (result.total === 0) {
      console.log(`  \x1b[90m○\x1b[0m ${fromName} → ${toName}: nothing new`);
    } else {
      const parts = Object.entries(result.synced).map(([dir, n]) => `${n} ${dir.split("/").pop()}`);
      console.log(`  \x1b[32m✓\x1b[0m ${fromName} → ${toName}: ${parts.join(", ")}`);
    }
  }

  const totalAll = results.reduce((a, r) => a + r.total, 0);
  if (totalAll > 0) {
    console.log(`\n  \x1b[32m${totalAll} file(s) synced.\x1b[0m\n`);
  } else {
    console.log();
  }

  return results;
}

/**
 * ki soul-sync --project — absorb project ψ/ into kappa ψ/ (inward only).
 * Kappa cwd: absorbs from each project_repos entry.
 * Project cwd: pushes ψ/ to the kappa that owns this repo.
 */
export async function cmdSoulSyncProject(opts?: { cwd?: string }): Promise<ProjectSyncResult[]> {
  const results: ProjectSyncResult[] = [];
  const ghqRoot = loadConfig().ghqRoot;

  let cwd = opts?.cwd || "";
  if (!cwd) {
    try {
      cwd = (await hostExec("tmux display-message -p '#{pane_current_path}'")).trim();
    } catch {
      cwd = process.cwd();
    }
  }

  let repoRoot = cwd;
  try {
    const top = (await hostExec(`git -C '${cwd}' rev-parse --show-toplevel`)).trim();
    if (top) repoRoot = top;
  } catch { /* not a git repo */ }

  const repoSlug = resolveProjectSlug(repoRoot, ghqRoot);
  const repoBase = basename(repoRoot).replace(/\.wt-.*$/, "");
  const isKappa = repoBase.endsWith("-kappa");

  console.log(`\n  \x1b[36m⚡ Soul Sync (project)\x1b[0m — ${isKappa ? "absorbing into" : "exporting from"} ${repoBase}\n`);

  if (isKappa) {
    const kappaName = repoBase.replace(/-kappa$/, "");
    const projects = findProjectsForKappa(kappaName);
    if (projects.length === 0) {
      console.log(`  \x1b[33m⚠\x1b[0m no project_repos configured for '${kappaName}'`);
      console.log(`  \x1b[90mAdd "project_repos": ["org/repo"] to fleet config for ${kappaName}.\x1b[0m\n`);
      return results;
    }
    for (const projectRepo of projects) {
      const projectPath = join(ghqRoot, projectRepo);
      if (!existsSync(projectPath)) {
        console.log(`  \x1b[33m⚠\x1b[0m ${projectRepo}: not found at ${projectPath}, skipping`);
        continue;
      }
      const result = syncProjectVault(projectPath, repoRoot, projectRepo, kappaName);
      results.push(result);
      reportProjectResult(result);
    }
  } else {
    if (!repoSlug) {
      console.log(`  \x1b[33m⚠\x1b[0m cannot resolve project slug from ${repoRoot} (not under ghq root ${ghqRoot})\n`);
      return results;
    }
    const kappaName = findKappaForProject(repoSlug);
    if (!kappaName) {
      console.log(`  \x1b[33m⚠\x1b[0m no kappa owns project '${repoSlug}'`);
      console.log(`  \x1b[90mAdd "project_repos": ["${repoSlug}"] to an kappa's fleet config.\x1b[0m\n`);
      return results;
    }
    const kappaPath = await resolveKappaPath(kappaName);
    if (!kappaPath) {
      console.log(`  \x1b[33m⚠\x1b[0m kappa '${kappaName}' repo not found locally\n`);
      return results;
    }
    const result = syncProjectVault(repoRoot, kappaPath, repoSlug, kappaName);
    results.push(result);
    reportProjectResult(result);
  }

  const totalAll = results.reduce((a, r) => a + r.total, 0);
  if (totalAll > 0) {
    console.log(`\n  \x1b[32m${totalAll} file(s) absorbed.\x1b[0m\n`);
  } else {
    console.log();
  }
  return results;
}
