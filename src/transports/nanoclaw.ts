/**
 * NanoClaw transport — bridge to external chat channels (Telegram, Discord, etc.)
 *
 * Routes messages through a running NanoClaw instance via HTTP.
 * Config: aoi.config.json → nanoclaw: { url: "http://localhost:3001", channels: { nat: "tg:123456789" } }
 *
 * canReach() returns true for targets matching nanoclaw channel aliases or JID patterns.
 * send() POSTs { jid, text } to nanoclaw's /send endpoint for delivery.
 */

import type { Transport, TransportTarget, TransportMessage, TransportPresence } from "../core/transport/transport";
import type { FeedEvent } from "../lib/feed";
import { loadConfig } from "../core/config";
import { curlFetch } from "../core/transport/curl-fetch";

/** Resolve an oracle name to a NanoClaw JID + URL using config */
function resolveNanoclawJid(oracle: string): { jid: string; url: string } | null {
  const config = loadConfig();
  const nc = config.nanoclaw as { url?: string; channels?: Record<string, string> } | undefined;
  if (!nc?.url || !nc?.channels) return null;
  const jid = nc.channels[oracle];
  if (!jid) return null;
  return { jid, url: nc.url };
}

/** Send a message through NanoClaw's HTTP endpoint */
async function sendViaNanoclaw(jid: string, text: string, url: string): Promise<boolean> {
  try {
    const res = await curlFetch(`${url}/send`, { method: "POST", body: JSON.stringify({ jid, text }) });
    return res.ok;
  } catch {
    return false;
  }
}

export class NanoclawTransport implements Transport {
  readonly name = "nanoclaw";
  private _connected = true; // Stateless HTTP — always "connected"
  private msgHandlers = new Set<(msg: TransportMessage) => void>();
  private presenceHandlers = new Set<(p: TransportPresence) => void>();
  private feedHandlers = new Set<(e: FeedEvent) => void>();

  get connected() { return this._connected; }

  async connect(): Promise<void> { this._connected = true; }
  async disconnect(): Promise<void> { this._connected = false; }

  async send(target: TransportTarget, message: string): Promise<boolean> {
    const resolved = resolveNanoclawJid(target.oracle);
    if (!resolved) return false;
    return sendViaNanoclaw(resolved.jid, message, resolved.url);
  }

  async publishPresence(_presence: TransportPresence): Promise<void> {}
  async publishFeed(_event: FeedEvent): Promise<void> {}

  onMessage(handler: (msg: TransportMessage) => void) { this.msgHandlers.add(handler); }
  onPresence(handler: (p: TransportPresence) => void) { this.presenceHandlers.add(handler); }
  onFeed(handler: (e: FeedEvent) => void) { this.feedHandlers.add(handler); }

  /** Can reach targets that resolve to a nanoclaw channel JID */
  canReach(target: TransportTarget): boolean {
    return resolveNanoclawJid(target.oracle) !== null;
  }
}
