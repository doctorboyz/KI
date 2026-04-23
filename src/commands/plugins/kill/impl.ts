import { listSessions, hostExec, tmuxCmd } from "../../../sdk";
import { resolveSessionTarget } from "../../../core/matcher/resolve-target";

export interface KillOpts {
  /** Pane index — narrows kill to a specific pane of the resolved window. */
  pane?: number;
}

/**
 * ki kill <target>[:window] [--pane N]
 *
 * Trust the user — if they typed it, they meant it. No --force gate.
 *
 *   ki kill <session>            → kill whole session
 *   ki kill <session>:<window>   → kill that window
 *   ki kill <target> --pane N    → kill pane N of target window
 *
 * Target resolution mirrors ki split: bare session names go through the
 * canonical `resolveSessionTarget` matcher. Silent wrong-answer is worse
 * than a loud failure.
 */
export async function cmdKill(target: string, opts: KillOpts = {}) {
  if (!target) {
    console.error("usage: ki kill <target>[:window] [--pane N]");
    console.error("  e.g. ki kill kijs");
    console.error("       ki kill kijs:0");
    console.error("       ki kill kijs --pane 1");
    throw new Error("usage: ki kill <target>[:window] [--pane N]");
  }

  const [rawSession, rawWindow] = target.includes(":")
    ? target.split(":", 2)
    : [target, ""];

  // Resolve bare session name against live fleet
  const sessions = await listSessions();
  const r = resolveSessionTarget(rawSession, sessions);

  if (r.kind === "ambiguous") {
    console.error(`  \x1b[31m✗\x1b[0m '${rawSession}' is ambiguous — matches ${r.candidates.length} sessions:`);
    for (const s of r.candidates) {
      console.error(`  \x1b[90m    • ${s.name}\x1b[0m`);
    }
    console.error(`  \x1b[90m  use the full name: ki kill <exact-session>\x1b[0m`);
    throw new Error(`'${rawSession}' is ambiguous`);
  }
  if (r.kind === "none") {
    console.error(`  \x1b[31m✗\x1b[0m session '${rawSession}' not found`);
    if (r.hints && r.hints.length > 0) {
      console.error(`  \x1b[90m  did you mean:\x1b[0m`);
      for (const s of r.hints) console.error(`  \x1b[90m    • ${s.name}\x1b[0m`);
    } else {
      console.error(`  \x1b[90m  try: ki ls\x1b[0m`);
    }
    throw new Error(`session '${rawSession}' not found`);
  }

  const session = r.match.name;
  const tmux = tmuxCmd();

  // --pane requires a window, bare session kill does not
  if (opts.pane !== undefined) {
    // Default to window 0 if no window given
    const win = rawWindow || String(r.match.windows[0]?.index ?? 0);
    const pane = `${session}:${win}.${opts.pane}`;
    try {
      await hostExec(`${tmux} kill-pane -t '${pane}'`);
      console.log(`  \x1b[32m✓\x1b[0m killed pane ${pane}`);
    } catch (e: any) {
      throw new Error(`kill-pane failed: ${e.message || e}`);
    }
    return;
  }

  if (rawWindow) {
    const win = `${session}:${rawWindow}`;
    try {
      await hostExec(`${tmux} kill-window -t '${win}'`);
      console.log(`  \x1b[32m✓\x1b[0m killed window ${win}`);
    } catch (e: any) {
      throw new Error(`kill-window failed: ${e.message || e}`);
    }
    return;
  }

  try {
    await hostExec(`${tmux} kill-session -t '${session}'`);
    console.log(`  \x1b[32m✓\x1b[0m killed session ${session}`);
  } catch (e: any) {
    throw new Error(`kill-session failed: ${e.message || e}`);
  }
}
