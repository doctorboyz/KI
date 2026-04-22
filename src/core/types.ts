import type { ServerWebSocket } from "bun";

export type WSData = { target: string | null; previewTargets: Set<string>; mode?: "pty" };
export type AoiWS = ServerWebSocket<WSData>;
export type Handler = (ws: AoiWS, data: any, engine: AoiEngine) => void | Promise<void>;

// Forward reference — resolved at runtime via engine.ts
import type { AoiEngine } from "./engine";
