import type { ServerWebSocket } from "bun";
import type { AoiEngine } from "./engine";

export type WSData = { target: string | null; previewTargets: Set<string>; mode?: "pty" };
export type AoiWS = ServerWebSocket<WSData>;
export type Handler = (ws: AoiWS, data: any, engine: AoiEngine) => void | Promise<void>;

// Re-export for consumers
export type { AoiEngine } from "./engine";
