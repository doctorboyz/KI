import type { ServerWebSocket } from "bun";
import type { KiEngine } from "./engine";

export type WSData = { target: string | null; previewTargets: Set<string>; mode?: "pty" };
export type KiWS = ServerWebSocket<WSData>;
export type Handler = (ws: KiWS, data: any, engine: KiEngine) => void | Promise<void>;

// Re-export for consumers
export type { KiEngine } from "./engine";
