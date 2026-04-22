import { useInput } from "ink";
import type { AppMode } from "../types/ui";
import { useAgentStore } from "../stores/agent-store";
import { useCommandStore } from "../stores/command-store";
import { useFeedStore } from "../stores/feed-store";
import { registry } from "../commands/registry";
import { getMawUrl } from "../utils/constants";

export function useKeyInput(mode: AppMode, onAction: (action: "tmux" | "logs" | "kill", agent: string) => void) {
  const commandStore = useCommandStore.getState();

  useInput((input, key) => {
    if (key.escape) {
      if (mode === "command") {
        commandStore.setMode("normal");
        commandStore.clearBuffer();
      } else if (mode === "action-menu") {
        commandStore.setMode("normal");
      }
      return;
    }

    if (mode === "command") {
      if (key.return) {
        const result = registry.execute(commandStore.buffer, {
          selectedAgent: useAgentStore.getState().selectedAgent()?.target ?? null,
          apiBase: getMawUrl(),
        });
        result.then((r) => commandStore.setLastResult(r));
        commandStore.commitCommand();
      } else if (key.tab) {
        const prefix = commandStore.buffer.startsWith("/")
          ? commandStore.buffer.slice(1).split(/\s/)[0]
          : "";
        const matches = registry.matching(prefix);
        commandStore.cycleAutocomplete(matches.length);
        if (matches.length > 0) {
          const selected = matches[commandStore.autocompleteIndex % matches.length];
          commandStore.setBuffer(`/${selected.name}`);
        }
      } else if (key.backspace || key.delete) {
        commandStore.backspace();
      } else if (key.upArrow) {
        commandStore.historyPrev();
      } else if (key.downArrow) {
        commandStore.historyNext();
      } else if (input && !key.ctrl && !key.meta) {
        commandStore.appendBuffer(input);
      }
      return;
    }

    if (mode === "action-menu") {
      const agent = useAgentStore.getState().selectedAgent()?.target;
      if (input === "t" && agent) onAction("tmux", agent);
      else if (input === "l" && agent) onAction("logs", agent);
      else if (input === "k" && agent) onAction("kill", agent);
      return;
    }

    // Normal mode
    if (input === "/") {
      commandStore.setMode("command");
      commandStore.clearBuffer();
      return;
    }

    if (key.upArrow || input === "k") {
      useAgentStore.getState().selectPrev();
    } else if (key.downArrow || input === "j") {
      useAgentStore.getState().selectNext();
    } else if (key.return) {
      commandStore.setMode("action-menu");
    } else if (input === "f") {
      const current = useFeedStore.getState().filter;
      const selected = useAgentStore.getState().selectedAgent();
      useFeedStore.getState().setFilter(current ? null : selected?.name ?? null);
    } else if (input === "q") {
      process.exit(0);
    }
  });
}