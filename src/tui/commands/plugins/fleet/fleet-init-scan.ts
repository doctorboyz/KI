import { join } from "path";
import { existsSync, mkdirSync, rmSync } from "fs";
import { hostExec } from "../../../../sdk";
import { FLEET_DIR } from "../../../../sdk";
import { ghqList } from "../../../../core/ghq";

interface FleetWindow {
  name: string;
  repo: string;
}

interface FleetSession {
  name: string;
  windows: FleetWindow[];
  skip_command?: boolean;
}

// Default grouping: kappa name → session (1:1, no more shared sessions)
const GROUPS: Record<string, { session: string; order: number }> = {
  // Command layer (01-04) — always on
  pulse: { session: "pulse", order: 1 },
  hermes: { session: "hermes", order: 2 },
  neo: { session: "neo", order: 3 },
  homekeeper: { session: "homekeeper", order: 4 },
  // Project layer (05-10) — on demand
  volt: { session: "volt", order: 5 },
  floodboy: { session: "floodboy", order: 6 },
  fireman: { session: "fireman", order: 7 },
  dustboy: { session: "dustboy", order: 8 },
  dustboychain: { session: "dustboychain", order: 9 },
  arthur: { session: "arthur", order: 10 },
  // Knowledge layer (11-14) — on demand
  calliope: { session: "calliope", order: 11 },
  odin: { session: "odin", order: 12 },
  mother: { session: "mother", order: 13 },
  nexus: { session: "nexus", order: 14 },
  // Brewing (15)
  xiaoer: { session: "xiaoer", order: 15 },
  // Dormant (20+)
  lake: { session: "lake", order: 20 },
  sea: { session: "sea", order: 21 },
  phukhao: { session: "phukhao", order: 22 },
  shrimp: { session: "shrimp", order: 23 },
  tworivers: { session: "tworivers", order: 24 },
  brewsboy: { session: "brewsboy", order: 25 },
  natsbrain: { session: "natsbrain", order: 26 },
  opensourcenatbrain: { session: "opensourcenatbrain", order: 27 },
  maeoncraft: { session: "maeoncraft", order: 28 },
  maeon: { session: "maeoncraft", order: 28 },
  landing: { session: "landing", order: 29 },
};

export async function cmdFleetInit() {
  const fleetDir = FLEET_DIR;
  // Clean old configs to prevent duplicate numbering (#82)
  if (existsSync(fleetDir)) rmSync(fleetDir, { recursive: true });
  mkdirSync(fleetDir, { recursive: true });

  // Scan ghq for kappa repos
  console.log(`\n  \x1b[36mScanning for kappa repos...\x1b[0m\n`);

  const allRepos = await ghqList();

  // Find kappa repos
  const kappaRepos: { name: string; path: string; repo: string; worktrees: { name: string; path: string; repo: string }[] }[] = [];

  for (const repoPath of allRepos) {
    const parts = repoPath.split("/");
    const repoName = parts.pop()!;
    const org = parts.pop()!;
    const parentDir = parts.join("/") + "/" + org;

    // Match *-kappa repos or known names
    let kappaName: string | null = null;
    if (repoName.endsWith("-kappa")) {
      kappaName = repoName.replace(/-kappa$/, "").replace(/-/g, "");
    } else if (repoName === "homelab") {
      kappaName = "homekeeper";
    }

    if (!kappaName) continue;
    // Skip worktree dirs (they have .wt- in the name)
    if (repoName.includes(".wt-")) continue;

    // Find worktrees (strip number prefix from window name)
    const worktrees: { name: string; path: string; repo: string }[] = [];
    try {
      const wtOut = await hostExec(`ls -d ${parentDir}/${repoName}.wt-* 2>/dev/null || true`);
      const usedNames = new Set<string>();
      for (const wtPath of wtOut.split("\n").filter(Boolean)) {
        const wtBase = wtPath.split("/").pop()!;
        const suffix = wtBase.replace(`${repoName}.wt-`, "");
        const taskPart = suffix.replace(/^\d+-/, "");
        let windowName = `${kappaName}-${taskPart}`;
        if (usedNames.has(windowName)) windowName = `${kappaName}-${suffix}`; // collision fallback
        usedNames.add(windowName);
        worktrees.push({
          name: windowName,
          path: wtPath,
          repo: `${org}/${wtBase}`,
        });
      }
    } catch { /* no worktrees */ }

    kappaRepos.push({
      name: kappaName,
      path: repoPath,
      repo: `${org}/${repoName}`,
      worktrees,
    });

    const wtInfo = worktrees.length > 0 ? ` + ${worktrees.length} worktrees` : "";
    console.log(`  found: ${kappaName.padEnd(15)} ${org}/${repoName}${wtInfo}`);
  }

  // Group into sessions
  const sessionMap = new Map<string, { order: number; windows: FleetWindow[] }>();

  for (const kappa of kappaRepos) {
    const group = GROUPS[kappa.name] || { session: kappa.name, order: 50 };
    const key = group.session;

    if (!sessionMap.has(key)) {
      sessionMap.set(key, { order: group.order, windows: [] });
    }

    const sess = sessionMap.get(key)!;
    sess.windows.push({ name: `${kappa.name}-kappa`, repo: kappa.repo });

    for (const wt of kappa.worktrees) {
      sess.windows.push({ name: wt.name, repo: wt.repo });
    }
  }

  // Write fleet files
  console.log(`\n  \x1b[36mWriting fleet configs...\x1b[0m\n`);

  const sorted = [...sessionMap.entries()].sort((a, b) => a[1].order - b[1].order);

  for (const [groupName, data] of sorted) {
    const paddedNum = String(data.order).padStart(2, "0");
    const sessionName = `${paddedNum}-${groupName}`;
    const config: FleetSession = { name: sessionName, windows: data.windows };
    const filePath = join(fleetDir, `${sessionName}.json`);

    await Bun.write(filePath, JSON.stringify(config, null, 2) + "\n");
    console.log(`  \x1b[32m✓\x1b[0m ${sessionName}.json — ${data.windows.length} windows`);
  }

  // Add overview session
  if (kappaRepos.length > 0) {
    const overviewConfig: FleetSession = {
      name: "99-overview",
      windows: [{ name: "live", repo: kappaRepos[0].repo }],
      skip_command: true,
    };
    await Bun.write(join(fleetDir, "99-overview.json"), JSON.stringify(overviewConfig, null, 2) + "\n");
    console.log(`  \x1b[32m✓\x1b[0m 99-overview.json — 1 window`);
  }

  console.log(`\n  \x1b[32m${sorted.length + 1} fleet configs written to fleet/\x1b[0m`);
  console.log(`  Run \x1b[36mki wake all\x1b[0m to start the fleet.\n`);
}
