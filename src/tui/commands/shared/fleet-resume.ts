import { hostExec as ssh, tmux } from "../../../sdk";
import { loadConfig, buildCommand } from "../../../core/config";
import type { FleetSession } from "./fleet-load";

/** After fleet spawn, send /recap to kappas with active Pulse board items */
export async function resumeActiveItems() {
  const repo = "laris-co/pulse-kappa";
  try {
    const issuesJson = await ssh(
      `gh issue list --repo ${repo} --state open --json number,title,labels --limit 50`
    );
    const issues: { number: number; title: string; labels: { name: string }[] }[] = JSON.parse(issuesJson || "[]");

    // Find issues assigned to kappas (label: kappa:<name>)
    const kappaItems = issues
      .filter(i => !i.labels.some(l => l.name === "daily-thread"))
      .map(i => ({
        ...i,
        kappa: i.labels.find(l => l.name.startsWith("kappa:"))?.name.replace("kappa:", ""),
      }))
      .filter(i => i.kappa);

    if (!kappaItems.length) {
      console.log("  \x1b[90mNo active board items to resume.\x1b[0m");
      return;
    }

    // Group by kappa, send /recap once per kappa
    const byKappa = new Map<string, typeof kappaItems>();
    for (const item of kappaItems) {
      const list = byKappa.get(item.kappa!) || [];
      list.push(item);
      byKappa.set(item.kappa!, list);
    }

    for (const [kappa, items] of byKappa) {
      const windowName = `${kappa}-kappa`;
      // Find which session has this window
      const sessions = await tmux.listSessions();
      for (const sess of sessions) {
        try {
          const windows = await tmux.listWindows(sess.name);
          const win = windows.find(w => w.name.toLowerCase() === windowName.toLowerCase());
          if (win) {
            const titles = items.map(i => `#${i.number}`).join(", ");
            // Wait for Claude to be ready (give it time to start)
            await new Promise(r => setTimeout(r, 2000));
            await tmux.sendText(`${sess.name}:${win.name}`, `/recap --deep — Resume after reboot. Active items: ${titles}`);
            console.log(`  \x1b[32m↻\x1b[0m ${kappa}: /recap sent (${titles})`);
            break;
          }
        } catch { /* window not found in this session */ }
      }
    }
  } catch (e) {
    console.log(`  \x1b[33mresume skipped:\x1b[0m ${e}`);
  }
}

/**
 * Scan disk for worktrees not registered in fleet configs.
 * For each running session, check if there are worktrees on disk
 * that don't have a corresponding tmux window, and spawn them.
 */
export async function respawnMissingWorktrees(sessions: FleetSession[]): Promise<number> {
  const ghqRoot = loadConfig().ghqRoot;
  let spawned = 0;

  for (const sess of sessions) {
    if (sess.skip_command) continue;

    // Find kappa main windows (pattern: {name}-kappa)
    const mainWindows = sess.windows.filter(w => w.name.endsWith("-kappa"));
    const registeredNames = new Set(sess.windows.map(w => w.name));

    for (const main of mainWindows) {
      const kappaName = main.name.replace(/-kappa$/, "");
      const repoPath = `${ghqRoot}/${main.repo}`;
      const repoName = main.repo.split("/").pop()!;
      const parentDir = repoPath.replace(/\/[^/]+$/, "");

      // Scan disk for worktrees
      let wtPaths: string[] = [];
      try {
        const raw = await ssh(`ls -d ${parentDir}/${repoName}.wt-* 2>/dev/null || true`);
        wtPaths = raw.split("\n").filter(Boolean);
      } catch { continue; }

      // Get running windows for this session
      let runningWindows: string[] = [];
      try {
        const windows = await tmux.listWindows(sess.name);
        runningWindows = windows.map(w => w.name);
      } catch { continue; }

      const usedNames = new Set([...registeredNames, ...runningWindows]);
      for (const wtPath of wtPaths) {
        const wtBase = wtPath.split("/").pop()!;
        const suffix = wtBase.replace(`${repoName}.wt-`, "");
        const taskPart = suffix.replace(/^\d+-/, "");
        let windowName = `${kappaName}-${taskPart}`;
        if (usedNames.has(windowName)) {
          // If collision is with fleet config or running window, this worktree is already covered
          if (registeredNames.has(windowName) || runningWindows.includes(windowName)) continue;
          // True collision with another worktree in this loop → use numbered fallback
          windowName = `${kappaName}-${suffix}`;
        }
        const altName = `${kappaName}-${suffix}`; // old-style name with number

        // Skip if already registered in fleet config or running
        if (registeredNames.has(windowName) || registeredNames.has(altName)) continue;
        if (runningWindows.includes(windowName) || runningWindows.includes(altName)) continue;

        usedNames.add(windowName);
        try {
          await tmux.newWindow(sess.name, windowName, { cwd: wtPath });
          await new Promise(r => setTimeout(r, 300));
          await tmux.sendText(`${sess.name}:${windowName}`, buildCommand(windowName));
          console.log(`  \x1b[32m↻\x1b[0m ${windowName} (discovered on disk)`);
          spawned++;
        } catch { /* window creation failed */ }
      }
    }
  }

  return spawned;
}
