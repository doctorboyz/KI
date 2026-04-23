/**
 * registry-kappa-scan-local — local ghq filesystem scan.
 *
 * Walks <ghqRoot>/<org>/<repo>/ detecting kappas by:
 *   - presence of ψ/ directory
 *   - fleet config lineage reference
 *   - -kappa suffix in repo name
 *
 * Also adds fleet-referenced repos not found on disk.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { FLEET_DIR } from "../paths";
import { loadConfig } from "../config";
import type { KappaEntry } from "./registry-kappa-types";

// ---------- Fleet lineage parsing ----------

interface FleetLineage {
  repo: string;             // e.g. "doctorboyz/kijs-kappa"
  budded_from: string | null;
  budded_at: string | null;
}

/** @internal */
export function readFleetLineage(): Map<string, FleetLineage> {
  const map = new Map<string, FleetLineage>();
  try {
    for (const file of readdirSync(FLEET_DIR).filter(f => f.endsWith(".json"))) {
      try {
        const config = JSON.parse(readFileSync(join(FLEET_DIR, file), "utf-8"));
        const repos: string[] = config.project_repos || [];
        for (const r of repos) {
          map.set(r, {
            repo: r,
            budded_from: config.budded_from || null,
            budded_at: config.budded_at || null,
          });
        }
        // Also check windows for repo references
        for (const w of config.windows || []) {
          if (w.repo && !map.has(w.repo)) {
            map.set(w.repo, {
              repo: w.repo,
              budded_from: config.budded_from || null,
              budded_at: config.budded_at || null,
            });
          }
        }
      } catch { /* invalid fleet file, skip */ }
    }
  } catch { /* fleet dir may not exist */ }
  return map;
}

/** @internal */
export function deriveName(repo: string): string {
  return repo.replace(/-kappa$/, "");
}

// ---------- Local scan ----------

/**
 * Scan local ghq for kappas. Verbose-by-default per user direction
 * (alpha.74, 2026-04-16) — pass verbose=false for the terse summary.
 * See `feedback_verbose_by_default`.
 */
export function scanLocal(verbose = true): KappaEntry[] {
  const config = loadConfig();
  const ghqRoot = config.ghqRoot;
  const now = new Date().toISOString();
  const fleetLineage = readFleetLineage();
  const entries: KappaEntry[] = [];
  const seen = new Set<string>();

  if (verbose) {
    console.log(`  \x1b[90m⏳ scanning ghq root: ${ghqRoot}\x1b[0m`);
    console.log(`  \x1b[90m  fleet lineage: ${fleetLineage.size} entries from ${FLEET_DIR}\x1b[0m`);
  }

  // Walk ghq root: <ghqRoot>/<org>/<repo>/
  try {
    for (const org of readdirSync(ghqRoot)) {
      const orgPath = join(ghqRoot, org);
      try {
        if (!statSync(orgPath).isDirectory()) continue;
      } catch { continue; }

      let repoCount = 0;
      let kappaCount = 0;

      for (const repo of readdirSync(orgPath)) {
        const repoPath = join(orgPath, repo);
        try {
          if (!statSync(repoPath).isDirectory()) continue;
        } catch { continue; }
        repoCount++;

        const key = `${org}/${repo}`;
        const hasPsi = existsSync(join(repoPath, "ψ"));
        const fleetKey = fleetLineage.has(key) ? key : null;
        const endsWithKappa = repo.endsWith("-kappa");

        // Detection rule: ψ/ OR fleet-referenced OR -kappa suffix
        if (!hasPsi && !fleetKey && !endsWithKappa) continue;

        if (seen.has(key)) continue;
        seen.add(key);
        kappaCount++;

        const lineage = fleetKey ? fleetLineage.get(fleetKey)! : null;

        if (verbose) {
          // Show WHY this was detected — transparency for the user
          const sources: string[] = [];
          if (hasPsi) sources.push("\x1b[32mψ\x1b[0m");
          if (fleetKey) sources.push("\x1b[36mfleet\x1b[0m");
          if (endsWithKappa) sources.push("\x1b[33m-kappa\x1b[0m");
          console.log(`  \x1b[90m  + ${key}\x1b[0m [${sources.join(" ")}]`);
        }

        entries.push({
          org,
          repo,
          name: deriveName(repo),
          local_path: repoPath,
          has_psi: hasPsi,
          has_fleet_config: !!fleetKey,
          budded_from: lineage?.budded_from || null,
          budded_at: lineage?.budded_at || null,
          federation_node: null, // populated below if ki.config.json exists
          detected_at: now,
        });
      }

      if (verbose && repoCount > 0) {
        console.log(`  \x1b[90m⏳ ${org}: ${repoCount} repos, ${kappaCount} kappas\x1b[0m`);
      }
    }
  } catch (e) {
    console.warn(`[kappa-registry] failed to walk ghq root ${ghqRoot}: ${e}`);
  }

  // Enrich with federation node from the current machine's config
  const localNode = config.node || null;
  const agents = config.agents || {};
  let fedEnriched = 0;
  for (const entry of entries) {
    // If this kappa's name matches a known agent → use its node
    const agentNode = agents[entry.name];
    if (agentNode) {
      entry.federation_node = agentNode;
      fedEnriched++;
    } else if (localNode) {
      // Default: if the kappa is local, it's on this node
      entry.federation_node = localNode;
    }
  }
  if (verbose && fedEnriched > 0) {
    console.log(`  \x1b[90m  federation-enriched ${fedEnriched} from config.agents\x1b[0m`);
  }

  // Also add fleet-referenced repos that aren't on disk
  let fleetOnly = 0;
  for (const [key, lineage] of fleetLineage) {
    if (!seen.has(key)) {
      const [org, repo] = key.split("/");
      if (org && repo) {
        fleetOnly++;
        if (verbose) {
          console.log(`  \x1b[90m  + ${key}\x1b[0m [\x1b[36mfleet-only\x1b[0m] (not cloned)`);
        }
        entries.push({
          org,
          repo,
          name: deriveName(repo),
          local_path: "",
          has_psi: false,
          has_fleet_config: true,
          budded_from: lineage.budded_from || null,
          budded_at: lineage.budded_at || null,
          federation_node: null,
          detected_at: now,
        });
      }
    }
  }
  if (verbose && fleetOnly > 0) {
    console.log(`  \x1b[90m  ${fleetOnly} fleet-only kappas (referenced but not cloned)\x1b[0m`);
  }

  return entries.sort((a, b) => {
    if (a.org !== b.org) return a.org.localeCompare(b.org);
    return a.name.localeCompare(b.name);
  });
}
