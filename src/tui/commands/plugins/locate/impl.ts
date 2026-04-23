/**
 * ki locate — diagnostic "where is this kappa?" command.
 *
 * Inspired by multi-agent-workflow-kit's `ki warp` (kit uses a bash
 * function to cd the parent shell into a worktree). kijs is a binary,
 * so we can't cd the caller — instead we PRINT location info across
 * the kappa's full information space: ghq repo, ψ/ presence, tmux
 * session, fleet config, federation node.
 *
 * Use `cd $(ki locate kijs --path)` if you want the kit's warp
 * behavior — the shell eval does the cd.
 */

import { existsSync } from "fs";
import { join } from "path";
import { ghqFind } from "../../../../core/ghq";
import { listSessions, FLEET_DIR } from "../../../../sdk";
import { loadConfig } from "../../../../core/config";
import { resolveSessionTarget } from "../../../../core/matcher/resolve-target";
import { UserError } from "../../../../core/util/user-error";

export interface LocateOpts {
  path?: boolean;
  json?: boolean;
}

interface LocateResult {
  name: string;
  repoPath: string | null;
  hasPsi: boolean;
  sessionName: string | null;
  windowCount: number;
  fleetConfigPath: string | null;
  federationNode: string | null;
  inAgentsConfig: boolean;
}

async function gatherInfo(kappa: string): Promise<LocateResult> {
  // ghq repo path — try `<name>-kappa` suffix first (canonical), then bare name
  const repoPath =
    (await ghqFind(`/${kappa}-kappa`)) ?? (await ghqFind(`/${kappa}`));

  // ψ/ presence
  const hasPsi = repoPath ? existsSync(join(repoPath, "ψ")) : false;

  // tmux session — use the alpha.77 suffix-preferred resolver so bare
  // name resolves to the `NN-name` canonical session, not a `name-view`.
  let sessionName: string | null = null;
  let windowCount = 0;
  try {
    const sessions = await listSessions();
    const r = resolveSessionTarget(kappa, sessions);
    if (r.kind === "exact" || r.kind === "fuzzy") {
      sessionName = r.match.name;
      windowCount = r.match.windows?.length ?? 0;
    }
  } catch {
    /* tmux not running — leave session null */
  }

  // Fleet config — check for a file matching this kappa
  let fleetConfigPath: string | null = null;
  if (sessionName) {
    const candidate = join(FLEET_DIR, `${sessionName}.json`);
    if (existsSync(candidate)) fleetConfigPath = candidate;
  }
  if (!fleetConfigPath) {
    // Fallback: try `<kappa>-kappa.json` or `<kappa>.json`
    for (const name of [`${kappa}-kappa`, kappa]) {
      const candidate = join(FLEET_DIR, `${name}.json`);
      if (existsSync(candidate)) {
        fleetConfigPath = candidate;
        break;
      }
    }
  }

  // Federation — config.agents map + node
  const config = loadConfig();
  const agents = config.agents ?? {};
  const inAgentsConfig = kappa in agents;
  const federationNode = inAgentsConfig ? agents[kappa]! : (config.node ?? null);

  return {
    name: kappa,
    repoPath,
    hasPsi,
    sessionName,
    windowCount,
    fleetConfigPath,
    federationNode,
    inAgentsConfig,
  };
}

export async function cmdLocate(kappa: string | undefined, opts: LocateOpts = {}): Promise<void> {
  if (!kappa) {
    console.error("usage: ki locate <kappa> [--path | --json]");
    console.error("  e.g. ki locate kijs");
    throw new UserError("missing kappa name");
  }

  const info = await gatherInfo(kappa);

  // Nothing found at all → not-found error (mirrors alpha.75 kappa-about fix)
  if (!info.repoPath && !info.sessionName && !info.fleetConfigPath) {
    throw new UserError(`no kappa named '${kappa}' — try: ki kappa ls`);
  }

  if (opts.json) {
    console.log(JSON.stringify(info, null, 2));
    return;
  }

  if (opts.path) {
    // --path emits ONE clean line for shell substitution: cd $(ki locate X --path)
    if (!info.repoPath) {
      throw new UserError(
        `no repo path for '${kappa}' (session: ${info.sessionName ?? "none"}, fleet: ${info.fleetConfigPath ? "yes" : "no"})`,
      );
    }
    console.log(info.repoPath);
    return;
  }

  // Default: human-readable multi-line summary. Omit missing fields rather
  // than faking values (per #390.2 — fake-success is worse than missing info).
  console.log(`\n📍 ${kappa}`);
  if (info.repoPath) {
    console.log(`   repo:     ${info.repoPath}`);
    console.log(`   ψ/:       ${info.hasPsi ? "present" : "missing"}`);
  }
  if (info.sessionName) {
    console.log(`   session:  ${info.sessionName} (${info.windowCount} window${info.windowCount === 1 ? "" : "s"})`);
  }
  if (info.fleetConfigPath) {
    console.log(`   fleet:    ${info.fleetConfigPath}`);
  }
  if (info.federationNode) {
    const suffix = info.inAgentsConfig ? " (from config.agents)" : " (this node)";
    console.log(`   node:     ${info.federationNode}${suffix}`);
  }
  console.log();
}
