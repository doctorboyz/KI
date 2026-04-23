import type { InvokeContext, InvokeResult } from "../../../../plugin/types";
import { cmdKappaAbout } from "../kappa/impl";

export const command = {
  name: ["about", "info"],
  description: "Show information about an kappa (session, repo, windows).",
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

    if (ctx.source === "cli") {
      const args = ctx.args as string[];
      if (!args[0]) {
        return { ok: false, error: "usage: ki about <kappa>" };
      }
      kappa = args[0];
    } else {
      const args = ctx.args as Record<string, unknown>;
      if (!args.kappa) {
        return { ok: false, error: "kappa is required" };
      }
      kappa = args.kappa as string;
    }

    await cmdKappaAbout(kappa);
    return { ok: true, output: logs.join("\n") || undefined };
  } catch (e: any) {
    return { ok: false, error: logs.join("\n") || e.message, output: logs.join("\n") || undefined };
  } finally {
    console.log = origLog;
    console.error = origError;
  }
}
