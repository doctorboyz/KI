import React, { useEffect, useRef } from "react";
import { Box, Text } from "ink";
import { useFeedStore } from "../../stores/feed-store";
import { useAgentStore } from "../../stores/agent-store";
import { FeedLine } from "./feed-line";

export function FeedViewer() {
  const events = useFeedStore((s) => s.events);
  const filter = useFeedStore((s) => s.filter);
  const selectedAgent = useAgentStore((s) => s.agents[useAgentStore.getState().selectedIndex]);

  const filtered = filter
    ? events.filter((e) => e.kappa === filter)
    : selectedAgent
      ? events.filter((e) => e.kappa === selectedAgent.name)
      : events;

  const visible = filtered.slice(-40);

  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="single" borderColor="gray" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color="cyan">
          Feed
        </Text>
        {filter && (
          <Text dimColor>
            filtered: {filter}
          </Text>
        )}
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {visible.length === 0 ? (
          <Text dimColor>No events</Text>
        ) : (
          visible.map((e, i) => <FeedLine key={`${e.ts}-${i}`} event={e} />)
        )}
      </Box>
    </Box>
  );
}