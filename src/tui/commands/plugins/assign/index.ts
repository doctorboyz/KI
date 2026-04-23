import type { InvokeContext, InvokeResult } from "../../../../plugin/types";
import { cmdAssign } from "./impl";

export const command = {
  name: "assign",
  description: "Assign a GitHub issue to an kappa.",
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
    const args = ctx.source === "cli" ? (ctx.args as string[]) : [];
    if (!args[0]) {
      throw new Error("usage: ki assign <issue-url> [--kappa <name>]");
    }
    const kappaIdx = args.indexOf("--kappa");
    const kappa = kappaIdx !== -1 ? args[kappaIdx + 1] : undefined;
    const issueUrl = args.filter((a, i) => a !== "--kappa" && (kappaIdx === -1 || i !== kappaIdx + 1))[0];
    await cmdAssign(issueUrl, { kappa });
    return { ok: true, output: logs.join("\n") || undefined };
  } catch (e: any) {
    return { ok: false, error: logs.join("\n") || e.message, output: logs.join("\n") || undefined };
  } finally {
    console.log = origLog;
    console.error = origError;
  }
}
