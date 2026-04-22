import { useEffect, useCallback } from "react";
import { AoiApiClient } from "../api/client";
import { useAgentStore } from "../stores/agent-store";
import { useConnectionStore } from "../stores/connection-store";
import { POLL_INTERVAL_MS } from "../utils/constants";

export function useAoiApi() {
  const client = new AoiApiClient();

  const refreshSessions = useCallback(async () => {
    try {
      const res = await client.getSessions();
      useAgentStore.getState().setAgentsFromSessions(res.sessions);
      useConnectionStore.getState().setAgentCount(res.sessions.length);
      useConnectionStore.getState().setApiHealthy(true);
    } catch {
      useConnectionStore.getState().setApiHealthy(false);
    }
  }, []);

  const fetchIdentity = useCallback(async () => {
    try {
      const id = await client.getIdentity();
      useConnectionStore.getState().setNode(id.node);
    } catch {
      // identity fetch is non-critical
    }
  }, []);

  return { refreshSessions, fetchIdentity, client };
}