/**
 * ki kappa register <name> — adopt a discovered kappa into the registry.
 *
 * Source priority: fleet config > tmux session > local filesystem.
 *
 * Errors:
 *   - Collision: name already in kappas[] → "already registered"
 *   - Missing: not found in any source → "kappa not found"
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { CONFIG_DIR, FLEET_DIR, listSessions, loadConfig } from "../../../sdk";
import type { KappaEntry } from "../../../sdk";

const CACHE_FILE = join(CONFIG_DIR, "kappas.json");

export interface RegisterOpts {
  json?: boolean;
}

// ─── Discovery sources ────────────────────────────────────────────────────────

export interface DiscoveredKappa {
  source: "fleet" | "tmux" | "filesystem";
  entry: KappaEntry;
}

export function findInFleet(
  name: string,
  fleetDir: string = FLEET_DIR,
): DiscoveredKappa | null {
  try {
    for (const file of readdirSync(fleetDir).filter((f) => f.endsWith(".json"))) {
      let config: any;
      try {
        config = JSON.parse(readFileSync(join(fleetDir, file), "utf-8"));
      } catch { continue; }

      const windows: any[] = config.windows || [];
      const hasThis = windows.some(
        (w) => w.name === `${name}-kappa` || w.name === name,
      );
      if (!hasThis) continue;

      // Derive repo from fleet file or windows
      const repos: string[] = config.project_repos || [];
      const repoFull = repos.find((r) => r.endsWith(`/${name}-kappa`) || r.endsWith(`/${name}`));
      const parts = repoFull ? repoFull.split("/") : [];
      const org = parts[0] || "(unknown)";
      const repo = parts[1] || `${name}-kappa`;
      const now = new Date().toISOString();

      return {
        source: "fleet",
        entry: {
          org,
          repo,
          name,
          local_path: "",
          has_psi: false,
          has_fleet_config: true,
          budded_from: config.budded_from || null,
          budded_at: config.budded_at || null,
          federation_node: null,
          detected_at: now,
        },
      };
    }
  } catch { /* fleet dir may not exist */ }
  return null;
}

export async function findInTmux(
  name: string,
  listSessionsFn: typeof listSessions = listSessions,
): Promise<DiscoveredKappa | null> {
  try {
    const sessions = await listSessionsFn();
    for (const s of sessions) {
      for (const w of s.windows) {
        if (w.name === `${name}-kappa` || w.name === name) {
          const now = new Date().toISOString();
          return {
            source: "tmux",
            entry: {
              org: "(unregistered)",
              repo: `${name}-kappa`,
              name,
              local_path: "",
              has_psi: false,
              has_fleet_config: false,
              budded_from: null,
              budded_at: null,
              federation_node: null,
              detected_at: now,
            },
          };
        }
      }
    }
  } catch { /* tmux not running */ }
  return null;
}

export function findInFilesystem(
  name: string,
  ghqRoot: string,
): DiscoveredKappa | null {
  try {
    for (const org of readdirSync(ghqRoot)) {
      const orgPath = join(ghqRoot, org);
      try {
        if (!statSync(orgPath).isDirectory()) continue;
      } catch { continue; }

      for (const candidate of [`${name}-kappa`, name]) {
        const repoPath = join(orgPath, candidate);
        try {
          if (!statSync(repoPath).isDirectory()) continue;
        } catch { continue; }

        const hasPsi = existsSync(join(repoPath, "ψ"));
        const now = new Date().toISOString();
        return {
          source: "filesystem",
          entry: {
            org,
            repo: candidate,
            name,
            local_path: repoPath,
            has_psi: hasPsi,
            has_fleet_config: false,
            budded_from: null,
            budded_at: null,
            federation_node: null,
            detected_at: now,
          },
        };
      }
    }
  } catch { /* ghq root may not exist */ }
  return null;
}

// ─── Raw registry I/O ─────────────────────────────────────────────────────────

function readRaw(file: string): Record<string, unknown> {
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf-8"));
  } catch { /* fall through */ }
  return {};
}

function writeRaw(file: string, data: Record<string, unknown>): void {
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ─── Driver ───────────────────────────────────────────────────────────────────

export async function cmdKappaRegister(
  name: string,
  opts: RegisterOpts = {},
  deps: {
    readRawCache?: () => Record<string, unknown>;
    writeRawCache?: (data: Record<string, unknown>) => void;
    findInFleetFn?: (name: string) => DiscoveredKappa | null;
    findInTmuxFn?: (name: string) => Promise<DiscoveredKappa | null>;
    findInFilesystemFn?: (name: string) => DiscoveredKappa | null;
  } = {},
): Promise<void> {
  if (!name) throw new Error("register requires a name: ki kappa register <name>");

  const readRawCache = deps.readRawCache ?? (() => readRaw(CACHE_FILE));
  const writeRawCache = deps.writeRawCache ?? ((data) => writeRaw(CACHE_FILE, data));

  const rawCache = readRawCache();
  const kappas: KappaEntry[] = (rawCache.kappas as KappaEntry[] | undefined) ?? [];

  // Collision check
  const existing = kappas.find((e) => e.name === name);
  if (existing) {
    throw new Error(`kappa '${name}' is already registered (org: ${existing.org})`);
  }

  // Discovery — fleet > tmux > filesystem
  const config = loadConfig();
  const ghqRoot = config.ghqRoot ?? "";

  const fleetFn = deps.findInFleetFn ?? findInFleet;
  const tmuxFn = deps.findInTmuxFn ?? findInTmux;
  const fsFn = deps.findInFilesystemFn ?? ((n) => findInFilesystem(n, ghqRoot));

  const discovered =
    fleetFn(name) ??
    (await tmuxFn(name)) ??
    fsFn(name);

  if (!discovered) {
    throw new Error(
      `kappa '${name}' not found in fleet, tmux, or filesystem — try: ki kappa scan`,
    );
  }

  // Add to registry
  kappas.push(discovered.entry);
  rawCache.kappas = kappas;
  writeRawCache(rawCache);

  if (opts.json) {
    console.log(JSON.stringify({ schema: 1, registered: discovered.entry, source: discovered.source }, null, 2));
    return;
  }

  console.log(`\n  \x1b[32m✓\x1b[0m Registered \x1b[36m${name}\x1b[0m`);
  console.log(`  Source:  ${discovered.source}`);
  console.log(`  Org:     ${discovered.entry.org}`);
  console.log(`  Repo:    ${discovered.entry.repo}`);
  if (discovered.entry.local_path) {
    console.log(`  Path:    ${discovered.entry.local_path}`);
  }
  console.log();
}
