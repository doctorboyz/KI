import type { FeedEvent, FeedEventType } from "../types/aoi";

const EVENT_COLORS: Record<FeedEventType, string> = {
  PreToolUse: "blue",
  PostToolUse: "green",
  PostToolUseFailure: "red",
  UserPromptSubmit: "cyan",
  SubagentStart: "magenta",
  SubagentStop: "magenta",
  TaskCompleted: "green",
  SessionStart: "green",
  SessionEnd: "yellow",
  Stop: "yellow",
  Notification: "yellow",
  MessageSend: "cyan",
  MessageDeliver: "green",
  MessageFail: "red",
  PluginHook: "gray",
  PluginFilter: "gray",
  PluginLoad: "gray",
  PluginError: "red",
};

export function eventColor(event: FeedEventType): string {
  return EVENT_COLORS[event] ?? "white";
}

export function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString("en-US", { hour12: false });
}

export function formatFeedLine(e: FeedEvent): string {
  const time = formatTime(e.ts);
  const evt = e.event;
  const msg = e.message ? ` ${truncate(e.message, 60)}` : "";
  return `[${time}] ${e.oracle} ▸ ${evt}${msg}`;
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export function statusIcon(status: string): string {
  switch (status) {
    case "busy":
      return "●";
    case "ready":
      return "○";
    case "idle":
      return "◌";
    case "crashed":
      return "✕";
    default:
      return "·";
  }
}