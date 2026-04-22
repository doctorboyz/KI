import { create } from "zustand";
import type { Session, FeedEvent } from "../types/maw";
import type { AgentStatus } from "../types/ui";

interface AgentState {
  agents: AgentStatus[];
  selectedIndex: number;
  captures: Record<string, string>;

  setAgentsFromSessions: (sessions: Session[]) => void;
  updateAgentFromFeed: (event: FeedEvent) => void;
  selectNext: () => void;
  selectPrev: () => void;
  selectByIndex: (i: number) => void;
  updateCapture: (target: string, content: string) => void;
  selectedAgent: () => AgentStatus | null;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  selectedIndex: 0,
  captures: {},

  setAgentsFromSessions: (sessions) =>
    set((state) => {
      const agents: AgentStatus[] = sessions.flatMap((s) =>
        s.windows.map((w) => ({
          target: w.name,
          name: w.name,
          session: s.name,
          status: "ready" as const,
          lastEvent: state.agents.find((a) => a.target === w.name)?.lastEvent,
        }))
      );
      return { agents };
    }),

  updateAgentFromFeed: (event) =>
    set((state) => {
      const agents = state.agents.map((a) => {
        if (a.target === event.oracle || a.name === event.oracle) {
          const status = event.event === "Stop" || event.event === "SessionEnd" ? "idle" : "busy";
          return { ...a, lastEvent: event, status: status as AgentStatus["status"] };
        }
        return a;
      });
      return { agents };
    }),

  selectNext: () =>
    set((state) => ({
      selectedIndex: Math.min(state.selectedIndex + 1, state.agents.length - 1),
    })),

  selectPrev: () =>
    set((state) => ({
      selectedIndex: Math.max(state.selectedIndex - 1, 0),
    })),

  selectByIndex: (i) => set({ selectedIndex: i }),

  updateCapture: (target, content) =>
    set((state) => ({
      captures: { ...state.captures, [target]: content },
    })),

  selectedAgent: () => {
    const { agents, selectedIndex } = get();
    return agents[selectedIndex] ?? null;
  },
}));