import { join, resolve, dirname } from "path";
import { mkdirSync } from "fs";
import { homedir } from "os";

export const AOI_ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");

/**
 * Resolve the aoi instance home directory.
 *
 * - When `AOI_HOME` is set, returns that path. This is the per-instance root
 *   used by `aoi serve --as <name>` to give each instance isolated state.
 * - Otherwise returns the default singleton root at `~/.aoi/`.
 *
 * Non-serve verbs pick up `AOI_HOME` via the env var only — there is no
 * `--instance` flag on individual plugins yet (issue #566 follow-up).
 */
export function resolveHome(): string {
  return process.env.AOI_HOME || join(homedir(), ".aoi");
}

/**
 * CONFIG_DIR resolution precedence:
 *   1. `AOI_HOME` set (instance mode) → `<AOI_HOME>/config`
 *   2. `AOI_CONFIG_DIR` env override (legacy)
 *   3. Default singleton `~/.config/aoi/`
 *
 * Evaluated once at import time. Callers that need per-instance state MUST
 * ensure `AOI_HOME` is set before any import of this module. The CLI does
 * this in src/cli.ts before any state-touching import is resolved.
 */
export const CONFIG_DIR = process.env.AOI_HOME
  ? join(process.env.AOI_HOME, "config")
  : (process.env.AOI_CONFIG_DIR || join(homedir(), ".config", "aoi"));
export const FLEET_DIR = join(CONFIG_DIR, "fleet");
export const CONFIG_FILE = join(CONFIG_DIR, "aoi.config.json");

// Ensure dirs exist on first import
mkdirSync(FLEET_DIR, { recursive: true });
