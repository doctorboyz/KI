import type { InvokeContext, InvokeResult } from "../../../plugin/types";
import { cmdSleepOne } from "./impl";

export const command = {
  name: ["sleep"],
  description: "Gracefully stop a single Kappa agent's tmux window.",
};

export default async function handler(ctx: InvokeContext): Promise<InvokeResult> {
  const logs: string[] = [];
  const origLog = console.log;
  const origError = console.error;
  console.log = (...a: any[]) => {
    if (ctx.writer) ctx.writer(...a);
    else logs.push(a.map(String).join(" "));
  };
  console.error = (...a: any[]) => {
    if (ctx.writer) ctx.writer(...a);
    else logs.push(a.map(String).join(" "));
  };
  try {
    let kappa: string;
    let window: string | undefined;

    if (ctx.source === "cli") {
      const args = ctx.args as string[];
      if (!args[0]) {
        return { ok: false, error: "usage: ki sleep <kappa> [window]" };
      }
      if (args[0] === "--all-done") {
        logs.push("(placeholder) ki sleep --all-done — sleep ALL agents. Not yet implemented.");
        return { ok: true, output: logs.join("\n") };
      }
      kappa = args[0];
      window = args[1];
    } else {
      const args = ctx.args as Record<string, unknown>;
      if (!args.kappa) {
        return { ok: false, error: "kappa is required" };
      }
      kappa = args.kappa as string;
      window = args.window as string | undefined;
    }

    await cmdSleepOne(kappa, window);
    return { ok: true, output: logs.join("\n") || undefined };
  } catch (e: any) {
    return { ok: false, error: logs.join("\n") || e.message, output: logs.join("\n") || undefined };
  } finally {
    console.log = origLog;
    console.error = origError;
  }
}
