import { create } from "zustand";

interface ConnectionState {
  wsStatus: "connecting" | "connected" | "reconnecting" | "disconnected";
  node: string;
  agentCount: number;
  apiHealthy: boolean;

  setWsStatus: (status: ConnectionState["wsStatus"]) => void;
  setNode: (node: string) => void;
  setAgentCount: (count: number) => void;
  setApiHealthy: (healthy: boolean) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  wsStatus: "disconnected",
  node: "local",
  agentCount: 0,
  apiHealthy: false,

  setWsStatus: (wsStatus) => set({ wsStatus }),
  setNode: (node) => set({ node }),
  setAgentCount: (agentCount) => set({ agentCount }),
  setApiHealthy: (apiHealthy) => set({ apiHealthy }),
}));