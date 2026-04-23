export const DEFAULT_KI_HOST = "localhost";
export const DEFAULT_KI_PORT = 3456;
export const WS_RECONNECT_BASE_MS = 1000;
export const WS_RECONNECT_MAX_MS = 30000;
export const FEED_MAX_LINES = 500;
export const POLL_INTERVAL_MS = 5000;

export function getKiUrl(): string {
  return process.env.KI_URL ?? `http://${DEFAULT_KI_HOST}:${DEFAULT_KI_PORT}`;
}

export function getWsUrl(): string {
  return process.env.KI_WS_URL ?? `ws://${DEFAULT_KI_HOST}:${DEFAULT_KI_PORT}/ws`;
}