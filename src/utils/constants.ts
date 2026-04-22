export const DEFAULT_MAW_HOST = "localhost";
export const DEFAULT_MAW_PORT = 3456;
export const WS_RECONNECT_BASE_MS = 1000;
export const WS_RECONNECT_MAX_MS = 30000;
export const FEED_MAX_LINES = 500;
export const POLL_INTERVAL_MS = 5000;

export function getMawUrl(): string {
  return process.env.MAW_URL ?? `http://${DEFAULT_MAW_HOST}:${DEFAULT_MAW_PORT}`;
}

export function getWsUrl(): string {
  return process.env.MAW_WS_URL ?? `ws://${DEFAULT_MAW_HOST}:${DEFAULT_MAW_PORT}/ws`;
}