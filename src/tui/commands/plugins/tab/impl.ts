import { hostExec } from "../../../../sdk";
import { tmux, tmuxCmd } from "../../../../sdk";
import { cmdPeek, cmdSend } from "../../shared/comm";
import { cmdTalkTo } from "../talk-to/impl";

/**
 * Get current tmux session name (whoami).
 * Uses tmux display-message which returns the session of the calling terminal.
 */
async function currentSession(): Promise<string> {
  try {
    return (await tmux.run("display-message", "-p", "#S")).trim();
  } catch {
    throw new Error("not inside a tmux session");
  }
}

/**
 * List windows in current session, mapping index → name.
 */
async function listTabs(session: string): Promise<{ index: number; name: string; active: boolean }[]> {
  const raw = await hostExec(
    `${tmuxCmd()} list-windows -t '${session}' -F '#{window_index}:#{window_name}:#{window_active}'`
  );
  return raw.split("\n").filter(Boolean).map(line => {
    const [idx, name, active] = line.split(":");
    return { index: +idx, name, active: active === "1" };
  });
}

/**
 * aoi tab          — list tabs in current session
 * aoi tab N        — peek tab N
 * aoi tab N "msg"  — hey tab N
 * aoi tab N --talk "msg" — talk-to tab N (future: #78)
 */
export async function cmdTab(tabArgs: string[]) {
  const session = await currentSession();
  const tabNum = tabArgs[0] ? parseInt(tabArgs[0], 10) : NaN;

  // aoi tab — list all tabs
  if (isNaN(tabNum)) {
    const tabs = await listTabs(session);
    console.log(`\x1b[36m${session}\x1b[0m tabs:`);
    for (const t of tabs) {
      const marker = t.active ? " \x1b[32m← you are here\x1b[0m" : "";
      console.log(`  ${t.index}: ${t.name}${marker}`);
    }
    return;
  }

  // Resolve tab number → window name
  const tabs = await listTabs(session);
  const tab = tabs.find(t => t.index === tabNum);
  if (!tab) {
    console.error(`available: ${tabs.map(t => t.index).join(", ")}`);
    throw new Error(`tab ${tabNum} not found in session ${session}`);
  }

  const hasTalk = tabArgs.includes("--talk");
  const remaining = tabArgs.slice(1).filter(a => a !== "--force" && a !== "--talk");
  const force = tabArgs.includes("--force");

  // aoi tab N — peek
  if (!remaining.length) {
    await cmdPeek(tab.name);
    return;
  }

  const message = remaining.join(" ");

  // aoi tab N --talk "msg" — talk-to (MCP + hey)
  if (hasTalk) {
    await cmdTalkTo(tab.name, message, force);
    return;
  }

  // aoi tab N "msg" — hey
  await cmdSend(tab.name, message, force);
}
