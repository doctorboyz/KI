import React from "react";
import { Box, Text } from "ink";
import { useAgentStore } from "../../stores/agent-store";
import { AgentRow } from "./agent-row";
import { AgentActions } from "./agent-actions";
import type { AppMode } from "../../types/ui";

interface AgentListProps {
  mode: AppMode;
  onAction: (action: "tmux" | "logs" | "kill", agent: string) => void;
}

export function AgentList({ mode, onAction }: AgentListProps) {
  const agents = useAgentStore((s) => s.agents);
  const selectedIndex = useAgentStore((s) => s.selectedIndex);
  const selectedAgent = agents[selectedIndex];

  return (
    <Box flexDirection="column" width={24} borderStyle="single" borderColor="gray" paddingX={1}>
      <Text bold color="cyan">
        Agents
      </Text>
      <Text dimColor>────────</Text>
      {agents.length === 0 ? (
        <Text dimColor>No agents</Text>
      ) : (
        agents.map((agent, i) => (
          <AgentRow key={agent.target} agent={agent} selected={i === selectedIndex} />
        ))
      )}
      {mode === "action-menu" && selectedAgent && (
        <Box marginTop={1}>
          <AgentActions agentName={selectedAgent.name} />
        </Box>
      )}
    </Box>
  );
}