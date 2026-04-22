import React from "react";
import { Box, Text } from "ink";

interface AgentActionsProps {
  agentName: string;
}

export function AgentActions({ agentName }: AgentActionsProps) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text bold color="cyan">
        Actions: {agentName}
      </Text>
      <Text>
        <Text color="green">[T]</Text> Jump to Tmux
      </Text>
      <Text>
        <Text color="green">[L]</Text> View Full Logs
      </Text>
      <Text>
        <Text color="red">[K]</Text> Kill/Done
      </Text>
      <Text dimColor>Escape to close</Text>
    </Box>
  );
}