export interface Session {
  name: string;
  source?: string;
  windows: Array<{
    index: number;
    name: string;
    active: boolean;
  }>;
}

export type FeedEventType =
  | "PreToolUse"
  | "PostToolUse"
  | "PostToolUseFailure"
  | "UserPromptSubmit"
  | "SubagentStart"
  | "SubagentStop"
  | "TaskCompleted"
  | "SessionEnd"
  | "SessionStart"
  | "Stop"
  | "Notification"
  | "MessageSend"
  | "MessageDeliver"
  | "MessageFail"
  | "PluginHook"
  | "PluginFilter"
  | "PluginLoad"
  | "PluginError";

export interface FeedEvent {
  timestamp: string;
  kappa: string;
  host: string;
  event: FeedEventType;
  project: string;
  sessionId: string;
  message: string;
  ts: number;
}

export interface FleetConfig {
  [key: string]: unknown;
}

export interface Peer {
  url: string;
  reachable: boolean;
  latency?: number;
  node?: string;
  agents?: string[];
  clockDeltaMs?: number;
  clockWarning?: boolean;
}

export interface FederationStatus {
  localUrl: string;
  peers: Peer[];
  totalPeers: number;
  reachablePeers: number;
  clockHealth?: {
    clockUtc: string;
    timezone: string;
    uptimeSeconds: number;
  };
}

export interface Identity {
  node: string;
  version: string;
  agents: string[];
  clockUtc: string;
  uptime: number;
}

export interface WakeBody {
  target: string;
  task?: string;
  command?: string;
}

export interface SleepBody {
  target: string;
}

export interface SendBody {
  target: string;
  text: string;
  force?: boolean;
}

export interface PeerExecBody {
  peer?: string;
  cmd?: string;
  args?: string[];
  signature?: string;
}

export interface FeedResponse {
  events: FeedEvent[];
  active_kappas: string[];
}

export interface FleetConfigResponse {
  configs: FleetConfig[];
}

export interface FleetResponse {
  fleet: Array<{ file: string; [key: string]: unknown }>;
}

export interface SessionsResponse {
  sessions: Session[];
}

export interface CaptureResponse {
  target: string;
  content: string;
}

export interface MirrorResponse {
  target: string;
  lines: string[];
}