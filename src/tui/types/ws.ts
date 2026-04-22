import type { FeedEvent, Session } from "./aoi";

export type WsMessage =
  | { type: "sessions"; sessions: Session[] }
  | { type: "capture"; target: string; content: string }
  | { type: "previews"; data: Record<string, string> }
  | { type: "feed"; event: FeedEvent }
  | { type: "feed-history"; events: FeedEvent[] }
  | { type: "recent"; agents: Array<{ target: string; name: string; session: string }> }
  | { type: "teams"; teams: unknown[] }
  | { type: "action-ok"; action: string; target: string }
  | { type: "sent"; ok: boolean; target: string; text: string }
  | { type: "error"; error: string };

export type WsOutgoing =
  | { type: "subscribe"; target: string }
  | { type: "subscribe-previews"; targets: string[] }
  | { type: "select"; target: string }
  | { type: "send"; target: string; text: string; force?: boolean }
  | { type: "sleep"; target: string }
  | { type: "stop"; target: string }
  | { type: "wake"; target: string; command?: string }
  | { type: "restart"; target: string; command?: string };