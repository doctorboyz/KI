import React, { useEffect, useCallback } from "react";
import { Box } from "ink";
import { StatusBar } from "./features/status-bar/status-bar";
import { AgentList } from "./features/agent-list/agent-list";
import { FeedViewer } from "./features/feed-viewer/feed-viewer";
import { CommandBar } from "./features/command-bar/command-bar";
import { useCommandStore } from "./stores/command-store";
import { useKeyInput } from "./hooks/use-key-input";
import { useAoiApi } from "./hooks/use-aoi-api";
import { useWebSocket } from "./hooks/use-websocket";
import { POLL_INTERVAL_MS } from "./utils/constants";
import { AoiApiClient } from "./api/client";
import { execSync } from "child_process";

export function App() {
  const mode = useCommandStore((s) => s.mode);
  const { refreshSessions, fetchIdentity } = useAoiApi();
  const wsRef = useWebSocket();

  const handleAction = useCallback(
    (action: "tmux" | "logs" | "kill", agent: string) => {
      const store = useCommandStore.getState();
      store.setMode("normal");

      switch (action) {
        case "tmux":
          try {
            execSync(`tmux attach -t ${agent}`, { stdio: "inherit" });
          } catch {
            store.setLastResult({ ok: false, error: `Cannot attach to ${agent}` });
          }
          break;
        case "logs": {
          const client = new AoiApiClient();
          client
            .getMirror(agent)
            .then((res: { lines: string[] }) => store.setLastResult({ ok: true, message: res.lines.join("\n") }))
            .catch((e: unknown) => store.setLastResult({ ok: false, error: String(e) }));
          break;
        }
        case "kill": {
          const client = new AoiApiClient();
          client
            .sleep({ target: agent })
            .then(() => store.setLastResult({ ok: true, message: `Killed ${agent}` }))
            .catch((e: unknown) => store.setLastResult({ ok: false, error: String(e) }));
          break;
        }
      }
    },
    []
  );

  useKeyInput(mode, handleAction);

  useEffect(() => {
    refreshSessions();
    fetchIdentity();

    const interval = setInterval(() => {
      refreshSessions();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [refreshSessions, fetchIdentity]);

  return (
    <Box flexDirection="column" height="100%">
      <StatusBar />
      <Box flexDirection="row" flexGrow={1}>
        <AgentList mode={mode} onAction={handleAction} />
        <FeedViewer />
      </Box>
      <CommandBar />
    </Box>
  );
}