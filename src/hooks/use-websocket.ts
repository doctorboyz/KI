import { useEffect, useRef } from "react";
import { MawWebSocket } from "../api/websocket";
import { useAgentStore } from "../stores/agent-store";
import { useFeedStore } from "../stores/feed-store";
import { useConnectionStore } from "../stores/connection-store";
import type { WsMessage } from "../types/ws";

export function useWebSocket() {
  const wsRef = useRef<MawWebSocket | null>(null);

  useEffect(() => {
    const handler = (msg: WsMessage) => {
      switch (msg.type) {
        case "sessions":
          useAgentStore.getState().setAgentsFromSessions(msg.sessions);
          break;
        case "feed":
          useFeedStore.getState().addEvent(msg.event);
          useAgentStore.getState().updateAgentFromFeed(msg.event);
          break;
        case "feed-history":
          useFeedStore.getState().setHistory(msg.events);
          break;
        case "capture":
          useAgentStore.getState().updateCapture(msg.target, msg.content);
          break;
        default:
          break;
      }
    };

    const ws = new MawWebSocket(handler);
    wsRef.current = ws;

    ws.setStatusCallback((status) => {
      useConnectionStore.getState().setWsStatus(status as typeof status extends string ? never : "connecting" | "connected" | "reconnecting" | "disconnected");
    });

    ws.connect();

    return () => {
      ws.disconnect();
    };
  }, []);

  return wsRef;
}