import type { FeedEvent } from "./ki";

export type FocusTarget = "agent-list" | "feed" | "command-bar";
export type AppMode = "normal" | "command" | "action-menu";

export interface AgentStatus {
  target: string;
  name: string;
  session: string;
  status: "busy" | "ready" | "idle" | "crashed" | "offline";
  lastEvent?: FeedEvent;
}