import { getWsUrl, WS_RECONNECT_BASE_MS, WS_RECONNECT_MAX_MS } from "../utils/constants";
import type { WsMessage, WsOutgoing } from "../types/ws";
import type { FeedEvent, Session } from "../types/aoi";

export type WsHandler = (msg: WsMessage) => void;

export class AoiWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private handler: WsHandler;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private status: "connecting" | "connected" | "reconnecting" | "disconnected" =
    "disconnected";
  private onStatusChange?: (status: string) => void;

  constructor(handler: WsHandler, url?: string) {
    this.url = url ?? getWsUrl();
    this.handler = handler;
  }

  setStatusCallback(cb: (status: string) => void) {
    this.onStatusChange = cb;
  }

  private updateStatus(status: typeof this.status) {
    this.status = status;
    this.onStatusChange?.(status);
  }

  connect() {
    this.intentionalClose = false;
    this.updateStatus("connecting");

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.updateStatus("connected");
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as WsMessage;
        this.handler(msg);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      } else {
        this.updateStatus("disconnected");
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  private scheduleReconnect() {
    this.updateStatus("reconnecting");
    const delay = Math.min(
      WS_RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempts),
      WS_RECONNECT_MAX_MS
    );
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.updateStatus("disconnected");
  }

  send(msg: WsOutgoing) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getStatus() {
    return this.status;
  }
}