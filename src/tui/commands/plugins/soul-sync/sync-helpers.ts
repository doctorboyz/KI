import { existsSync, readdirSync, copyFileSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";
import { loadFleet } from "../../shared/fleet-load";

const SYNC_DIRS = ["memory/learnings", "memory/retrospectives", "memory/traces", "memory/collaborations"];

/**
 * Sync new files from src dir to dst dir (skip existing).
 * Returns count of files copied.
 */
export function syncDir(srcDir: string, dstDir: string): number {
  if (!existsSync(srcDir)) return 0;
  let count = 0;

  function walk(src: string, dst: string) {
    let entries: string[];
    try { entries = readdirSync(src, { withFileTypes: true } as any) as any; }
    catch { return; }

    for (const entry of entries as any[]) {
      const srcPath = join(src, entry.name);
      const dstPath = join(dst, entry.name);
      if (entry.isDirectory()) {
        walk(srcPath, dstPath);
      } else if (!existsSync(dstPath)) {
        try {
          mkdirSync(dst, { recursive: true });
          copyFileSync(srcPath, dstPath);
          count++;
        } catch { /* skip unreadable files */ }
      }
    }
  }

  walk(srcDir, dstDir);
  return count;
}

/**
 * Find peer kappa names for a given kappa from fleet config.
 * Flat lookup — each kappa declares its own sync_peers.
 */
export function findPeers(kappaName: string): string[] {
  const fleet = loadFleet();
  for (const sess of fleet) {
    const name = sess.name.replace(/^\d+-/, "");
    if (name === kappaName && sess.sync_peers) return sess.sync_peers;
  }
  return [];
}

/**
 * Find project repos this kappa absorbs from.
 */
export function findProjectsForKappa(kappaName: string): string[] {
  const fleet = loadFleet();
  for (const sess of fleet) {
    const name = sess.name.replace(/^\d+-/, "");
    if (name === kappaName) return sess.project_repos || [];
  }
  return [];
}

export interface SoulSyncResult {
  from: string;
  to: string;
  synced: Record<string, number>;
  total: number;
}

/**
 * Sync ψ/memory/ from one kappa repo to another (new files only).
 */
export function syncKappaVaults(fromPath: string, toPath: string, fromName: string, toName: string): SoulSyncResult {
  const fromVault = join(fromPath, "ψ");
  const toVault = join(toPath, "ψ");

  const synced: Record<string, number> = {};
  for (const subdir of SYNC_DIRS) {
    const src = join(fromVault, subdir);
    const dst = join(toVault, subdir);
    const count = syncDir(src, dst);
    if (count > 0) synced[subdir] = count;
  }

  const total = Object.values(synced).reduce((a, b) => a + b, 0);

  if (total > 0) {
    const logDir = join(toVault, ".soul-sync");
    try {
      mkdirSync(logDir, { recursive: true });
      const ts = new Date().toISOString();
      const logLine = `${ts} | ${fromName} → ${toName} | ${total} files | ${Object.entries(synced).map(([k, v]) => `${v} ${k.split("/").pop()}`).join(", ")}\n`;
      appendFileSync(join(logDir, "sync.log"), logLine);
    } catch { /* non-critical */ }
  }

  return { from: fromName, to: toName, synced, total };
}

export interface ProjectSyncResult {
  project: string;
  kappa: string;
  synced: Record<string, number>;
  total: number;
}

/**
 * Sync ψ/memory/ from a project repo into an kappa repo.
 * Knowledge flows inward through the membrane — project → kappa, new files only.
 */
export function syncProjectVault(
  projectPath: string,
  kappaPath: string,
  projectRepo: string,
  kappaName: string,
): ProjectSyncResult {
  const projectVault = join(projectPath, "ψ");
  const kappaVault = join(kappaPath, "ψ");

  const synced: Record<string, number> = {};
  for (const subdir of SYNC_DIRS) {
    const src = join(projectVault, subdir);
    const dst = join(kappaVault, subdir);
    const count = syncDir(src, dst);
    if (count > 0) synced[subdir] = count;
  }
  const total = Object.values(synced).reduce((a, b) => a + b, 0);

  if (total > 0) {
    const logDir = join(kappaVault, ".soul-sync");
    try {
      mkdirSync(logDir, { recursive: true });
      const ts = new Date().toISOString();
      const logLine = `${ts} | project:${projectRepo} → ${kappaName} | ${total} files | ${Object.entries(synced).map(([k, v]) => `${v} ${k.split("/").pop()}`).join(", ")}\n`;
      appendFileSync(join(logDir, "sync.log"), logLine);
    } catch { /* non-critical */ }
  }

  return { project: projectRepo, kappa: kappaName, synced, total };
}

export function reportProjectResult(r: ProjectSyncResult) {
  if (r.total === 0) {
    console.log(`  \x1b[90m○\x1b[0m project:${r.project} → ${r.kappa}: nothing new`);
  } else {
    const parts = Object.entries(r.synced).map(([dir, n]) => `${n} ${dir.split("/").pop()}`);
    console.log(`  \x1b[32m✓\x1b[0m project:${r.project} → ${r.kappa}: ${parts.join(", ")}`);
  }
}
