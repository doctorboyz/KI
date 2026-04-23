import { cmdSend } from "../commands/shared/comm";
import { UserError } from "../core/util/user-error";

export async function routeComm(cmd: string, args: string[]): Promise<boolean> {
  // hey stays core — it's the transport layer
  if (cmd === "hey" || cmd === "send" || cmd === "tell") {
    const force = args.includes("--force");
    const target = args[1];
    const msgArgs = args.slice(2).filter(a => a !== "--force");

    // Distinguish: zero-args usage error vs missing-message error (#388.3)
    // A user who typed `ki hey kijs` (just the target, no message) was
    // previously indistinguishable from `ki hey` alone — both hit the
    // same "usage:" error. Now the missing-message case names the target
    // so the user sees their input got through.
    if (!target) {
      console.error("usage: ki hey <target> <message> [--force]");
      console.error("  target forms:");
      console.error("    <agent>                      bare name (exact local match, errors on ambiguity)");
      console.error("    <node>:<session>             canonical cross-node form (window 1)");
      console.error("    <node>:<session>:<window>    target a specific tmux window (#410)");
      console.error("  e.g. ki hey kijs \"hello from neo\"");
      console.error("       ki hey phaith:01-hojo:3 \"hello hojo-hermes\"");
      throw new UserError("missing target and message");
    }
    if (!msgArgs.length) {
      console.error(`✗ missing message for target '${target}'`);
      console.error(`  ki hey ${target} <message>`);
      console.error(`  (if '${target}' isn't a valid target, run 'ki ls' to see available ones)`);
      throw new UserError(`missing message for '${target}'`);
    }
    await cmdSend(target, msgArgs.join(" "), force);
    return true;
  }
  return false;
}
