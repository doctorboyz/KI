/**
 * comm-log-feed.ts — logMessage and emitFeed helpers.
 * Handles message audit log (JSONL) and feed event emission to server plugin pipeline.
 */

import { loadConfig } from "../../../core/config";
import { appendFile, mkdir } from "fs/promises";
import { homedir, hostname } from "os";
import { join } from "path";

/** Log message to ~/.kappa/ki-log.jsonl with normalized from/to */
export async function logMessage(from: string, to: string, msg: string, route: string) {
  const config = loadConfig();
  if (!config.node) throw new Error("config.node is required — set 'node' in ki.config.json");
  const normalizedFrom = from.includes(":") ? from : `${config.node}:${from}`;
  const logDir = join(homedir(), ".kappa");
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    from: normalizedFrom,
    to,
    msg: msg.slice(0, 500),
    host: hostname(),
    route,
  }) + "\n";
  try { await mkdir(logDir, { recursive: true }); await appendFile(join(logDir, "ki-log.jsonl"), line); } catch {}
}

/** Emit feed event to server plugin pipeline (CLI → server bridge) */
export function emitFeed(event: string, kappa: string, node: string, message: string, port: number) {
  fetch(`http://localhost:${port}/api/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, kappa, host: node, message, ts: Date.now() }),
  }).catch(() => {});
}
