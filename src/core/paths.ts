import { join, resolve, dirname } from "path";
import { mkdirSync } from "fs";
import { homedir } from "os";

export const KI_ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");

/**
 * Resolve the ki instance home directory.
 *
 * - When `KI_HOME` is set, returns that path. This is the per-instance root
 *   used by `ki serve --as <name>` to give each instance isolated state.
 * - Otherwise returns the default singleton root at `~/.ki/`.
 *
 * Non-serve verbs pick up `KI_HOME` via the env var only — there is no
 * `--instance` flag on individual plugins yet (issue #566 follow-up).
 */
export function resolveHome(): string {
  return process.env.KI_HOME || join(homedir(), ".ki");
}

/**
 * CONFIG_DIR resolution precedence:
 *   1. `KI_HOME` set (instance mode) → `<KI_HOME>/config`
 *   2. `KI_CONFIG_DIR` env override (legacy)
 *   3. Default singleton `~/.config/ki/`
 *
 * Evaluated once at import time. Callers that need per-instance state MUST
 * ensure `KI_HOME` is set before any import of this module. The CLI does
 * this in src/cli.ts before any state-touching import is resolved.
 */
export const CONFIG_DIR = process.env.KI_HOME
  ? join(process.env.KI_HOME, "config")
  : (process.env.KI_CONFIG_DIR || join(homedir(), ".config", "ki"));
export const FLEET_DIR = join(CONFIG_DIR, "fleet");
export const CONFIG_FILE = join(CONFIG_DIR, "ki.config.json");

// Ensure dirs exist on first import
mkdirSync(FLEET_DIR, { recursive: true });
