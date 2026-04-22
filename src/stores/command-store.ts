import { create } from "zustand";
import type { AppMode } from "../types/ui";
import type { CommandResult } from "../types/commands";

interface CommandState {
  mode: AppMode;
  buffer: string;
  history: string[];
  historyIndex: number;
  lastResult: CommandResult | null;
  autocompleteIndex: number;

  setMode: (mode: AppMode) => void;
  appendBuffer: (ch: string) => void;
  backspace: () => void;
  clearBuffer: () => void;
  commitCommand: () => void;
  setLastResult: (result: CommandResult | null) => void;
  cycleAutocomplete: (total: number) => void;
  resetAutocomplete: () => void;
  historyPrev: () => void;
  historyNext: () => void;
  setBuffer: (buf: string) => void;
}

export const useCommandStore = create<CommandState>((set, get) => ({
  mode: "normal",
  buffer: "",
  history: [],
  historyIndex: -1,
  lastResult: null,
  autocompleteIndex: 0,

  setMode: (mode) => set({ mode }),

  appendBuffer: (ch) => set((state) => ({ buffer: state.buffer + ch })),

  backspace: () =>
    set((state) => ({ buffer: state.buffer.slice(0, -1) })),

  clearBuffer: () => set({ buffer: "", autocompleteIndex: 0 }),

  commitCommand: () =>
    set((state) => {
      if (state.buffer.trim()) {
        return {
          history: [...state.history, state.buffer],
          historyIndex: -1,
          buffer: "",
          mode: "normal" as AppMode,
          autocompleteIndex: 0,
        };
      }
      return { buffer: "", mode: "normal" as AppMode, autocompleteIndex: 0 };
    }),

  setLastResult: (result) => set({ lastResult: result }),

  cycleAutocomplete: (total) =>
    set((state) => ({
      autocompleteIndex: (state.autocompleteIndex + 1) % Math.max(total, 1),
    })),

  resetAutocomplete: () => set({ autocompleteIndex: 0 }),

  historyPrev: () =>
    set((state) => {
      if (state.history.length === 0) return {};
      const newIndex = Math.min(state.historyIndex + 1, state.history.length - 1);
      return { historyIndex: newIndex, buffer: state.history[state.history.length - 1 - newIndex] ?? "" };
    }),

  historyNext: () =>
    set((state) => {
      if (state.historyIndex <= 0) return { historyIndex: -1, buffer: "" };
      const newIndex = state.historyIndex - 1;
      return { historyIndex: newIndex, buffer: state.history[state.history.length - 1 - newIndex] ?? "" };
    }),

  setBuffer: (buf) => set({ buffer: buf }),
}));