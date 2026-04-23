import { create } from "zustand";
import type { FeedEvent } from "../types/ki";
import { FEED_MAX_LINES } from "../utils/constants";

interface FeedState {
  events: FeedEvent[];
  filter: string | null;
  scrollOffset: number;

  setHistory: (events: FeedEvent[]) => void;
  addEvent: (event: FeedEvent) => void;
  setFilter: (kappa: string | null) => void;
  scrollUp: () => void;
  scrollDown: () => void;
  clear: () => void;
  filteredEvents: () => FeedEvent[];
}

export const useFeedStore = create<FeedState>((set, get) => ({
  events: [],
  filter: null,
  scrollOffset: 0,

  setHistory: (events) => set({ events: events.slice(-FEED_MAX_LINES) }),

  addEvent: (event) =>
    set((state) => {
      const events = [...state.events, event].slice(-FEED_MAX_LINES);
      return { events, scrollOffset: 0 };
    }),

  setFilter: (kappa) => set({ filter: kappa, scrollOffset: 0 }),

  scrollUp: () =>
    set((state) => ({
      scrollOffset: Math.min(state.scrollOffset + 1, state.events.length - 1),
    })),

  scrollDown: () =>
    set((state) => ({
      scrollOffset: Math.max(state.scrollOffset - 1, 0),
    })),

  clear: () => set({ events: [], scrollOffset: 0 }),

  filteredEvents: () => {
    const { events, filter } = get();
    if (!filter) return events;
    return events.filter((e) => e.kappa === filter);
  },
}));