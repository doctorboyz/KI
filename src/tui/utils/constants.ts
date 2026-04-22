export const DEFAULT_AOI_HOST = "localhost";
export const DEFAULT_AOI_PORT = 3456;
export const WS_RECONNECT_BASE_MS = 1000;
export const WS_RECONNECT_MAX_MS = 30000;
export const FEED_MAX_LINES = 500;
export const POLL_INTERVAL_MS = 5000;

export function getAoiUrl(): string {
  return process.env.AOI_URL ?? `http://${DEFAULT_AOI_HOST}:${DEFAULT_AOI_PORT}`;
}

export function getWsUrl(): string {
  return process.env.AOI_WS_URL ?? `ws://${DEFAULT_AOI_HOST}:${DEFAULT_AOI_PORT}/ws`;
}