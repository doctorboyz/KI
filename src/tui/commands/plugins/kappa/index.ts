import type { InvokeContext, InvokeResult } from "../../../../plugin/types";
import { cmdKappaList, cmdKappaAbout, cmdKappaScan, cmdKappaScanStale } from "./impl";
import { cmdKappaPrune } from "./impl-prune";
import { cmdKappaRegister } from "./impl-register";
import { parseFlags } from "../../../../cli-src/parse-args";

export const command = {
  name: ["kappa", "kappas"],
  description: "Kappa management — list, scan, about, prune, register",
};

// Shared spec for `ls` flags — used by both ls and the fleet alias.
const LS_FLAGS = {
  "--json": Boolean,
  "--awake": Boolean,
  "--scan": Boolean,
  "--stale": Boolean,
  "--org": String,
  "--path": Boolean,
  "-p": "--path",
} as const;

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
    if (ctx.source === "cli") {
      const args = ctx.args as string[];
      const subcmd = args[0]?.toLowerCase();
      if (!subcmd || subcmd === "ls" || subcmd === "list") {
        const flags = parseFlags(args, LS_FLAGS, 1);
        await cmdKappaList({
          awake: flags["--awake"],
          org: flags["--org"],
          json: flags["--json"],
          scan: flags["--scan"],
          stale: flags["--stale"],
          path: flags["--path"],
        });
      } else if (subcmd === "scan") {
        const flags = parseFlags(args, {
          "--json": Boolean,
          "--force": Boolean,
          "--local": Boolean,
          "--remote": Boolean,
          "--all": Boolean,
          "--stale": Boolean,
          "--verbose": Boolean,
          "-v": "--verbose",
          "--quiet": Boolean,
          "-q": "--quiet",
        }, 1);
        if (flags["--stale"]) {
          await cmdKappaScanStale({
            json: flags["--json"],
            all: flags["--all"],
          });
        } else {
          await cmdKappaScan({
            json: flags["--json"],
            force: flags["--force"],
            local: flags["--local"],
            remote: flags["--remote"],
            all: flags["--all"],
            verbose: flags["--verbose"],
            quiet: flags["--quiet"],
          });
        }
      } else if (subcmd === "fleet") {
        // Deprecated alias — warn then delegate to ls.
        console.error(
          `\x1b[33m⚠  ki kappa fleet is deprecated — use \x1b[36mki kappa ls\x1b[0m\x1b[33m instead\x1b[0m`,
        );
        const flags = parseFlags(args, LS_FLAGS, 1);
        await cmdKappaList({
          awake: flags["--awake"],
          org: flags["--org"],
          json: flags["--json"],
          scan: flags["--scan"],
          stale: flags["--stale"],
          path: flags["--path"],
        });
      } else if (subcmd === "prune") {
        const flags = parseFlags(args, {
          "--stale": Boolean,
          "--force": Boolean,
          "--json": Boolean,
        }, 1);
        await cmdKappaPrune({
          stale: flags["--stale"],
          force: flags["--force"],
          json: flags["--json"],
        });
      } else if (subcmd === "register") {
        const name = args[1];
        if (!name) return { ok: false, error: "usage: ki kappa register <name>" };
        const flags = parseFlags(args, { "--json": Boolean }, 2);
        await cmdKappaRegister(name, { json: flags["--json"] });
      } else if (subcmd === "about" && args[1]) {
        await cmdKappaAbout(args[1]);
      } else {
        return { ok: false, error: "usage: ki kappa [ls|scan|prune|register <name>|about <name>]" };
      }
    } else if (ctx.source === "api") {
      const query = ctx.args as Record<string, unknown>;
      const sub = (query.sub as string | undefined)?.toLowerCase();
      if (!sub || sub === "ls" || sub === "list") {
        await cmdKappaList({
          awake: query.awake as boolean | undefined,
          org: query.org as string | undefined,
          json: query.json as boolean | undefined,
          scan: query.scan as boolean | undefined,
          stale: query.stale as boolean | undefined,
          path: query.path as boolean | undefined,
        });
      } else if (sub === "scan") {
        if (query.stale) {
          await cmdKappaScanStale({
            json: query.json as boolean | undefined,
            all: query.all as boolean | undefined,
          });
        } else {
          await cmdKappaScan({
            json: query.json as boolean | undefined,
            force: query.force as boolean | undefined,
            local: query.local as boolean | undefined,
            remote: query.remote as boolean | undefined,
            all: query.all as boolean | undefined,
            verbose: query.verbose as boolean | undefined,
          });
        }
      } else if (sub === "fleet") {
        console.error(
          `\x1b[33m⚠  kappa.fleet is deprecated — use kappa.ls\x1b[0m`,
        );
        await cmdKappaList({
          awake: query.awake as boolean | undefined,
          org: query.org as string | undefined,
          json: query.json as boolean | undefined,
          scan: query.scan as boolean | undefined,
          stale: query.stale as boolean | undefined,
          path: query.path as boolean | undefined,
        });
      } else if (sub === "prune") {
        await cmdKappaPrune({
          stale: query.stale as boolean | undefined,
          force: query.force as boolean | undefined,
          json: query.json as boolean | undefined,
        });
      } else if (sub === "register") {
        if (!query.name) return { ok: false, error: "usage: query.sub=register + query.name" };
        await cmdKappaRegister(query.name as string, {
          json: query.json as boolean | undefined,
        });
      } else if (sub === "about" && query.name) {
        await cmdKappaAbout(query.name as string);
      } else {
        return { ok: false, error: "usage: query.sub=[ls|scan|prune|register|about] + query.name for about/register" };
      }
    }

    return { ok: true, output: logs.join("\n") || undefined };
  } catch (e: any) {
    return { ok: false, error: logs.join("\n") || e.message, output: logs.join("\n") || undefined };
  } finally {
    console.log = origLog;
    console.error = origError;
  }
}
