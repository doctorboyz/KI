import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";
import type { KiConfig } from "../../../core/config/types";

/** Atomically write JSON config; throws EEXIST if `wx` flag and file exists. */
export function writeConfigAtomic(filePath: string, config: Partial<KiConfig>, overwrite: boolean): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const body = JSON.stringify(config, null, 2) + "\n";
  if (overwrite) {
    writeFileSync(filePath, body, "utf-8");
    return;
  }
  // wx mode: fail if exists
  writeFileSync(filePath, body, { encoding: "utf-8", flag: "wx" });
}

export function backupConfig(filePath: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${filePath}.bak.${ts}`;
  copyFileSync(filePath, backupPath);
  return backupPath;
}

export function configExists(filePath: string): boolean {
  return existsSync(filePath);
}

export interface BuildConfigInput {
  node: string;
  ghqRoot: string;
  token?: string;
  federate?: boolean;
  peers?: { name: string; url: string }[];
  federationToken?: string;
}

const DEFAULT_PORT = 3456;
const DEFAULT_KAPPA_URL = "http://localhost:47778";
const DEFAULT_COMMAND = "claude --dangerously-skip-permissions --continue";

export function buildConfig(input: BuildConfigInput): Partial<KiConfig> {
  const env: Record<string, string> = {};
  if (input.token) env.CLAUDE_CODE_OAUTH_TOKEN = input.token;

  const cfg: Partial<KiConfig> = {
    host: input.node,
    node: input.node,
    port: DEFAULT_PORT,
    ghqRoot: input.ghqRoot,
    kappaUrl: DEFAULT_KAPPA_URL,
    env,
    commands: { default: DEFAULT_COMMAND },
    sessions: {},
  };

  if (input.federate) {
    cfg.federationToken = input.federationToken;
    cfg.namedPeers = input.peers ?? [];
  }

  return cfg;
}
