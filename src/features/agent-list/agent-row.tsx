import React from "react";
import { Box, Text } from "ink";
import type { AgentStatus } from "../../types/ui";

interface AgentRowProps {
  agent: AgentStatus;
  selected: boolean;
}

export function AgentRow({ agent, selected }: AgentRowProps) {
  const statusIcons: Record<string, string> = {
    busy: "●",
    ready: "○",
    idle: "◌",
    crashed: "✕",
    offline: "·",
  };

  const statusColors: Record<string, string> = {
    busy: "yellow",
    ready: "green",
    idle: "gray",
    crashed: "red",
    offline: "gray",
  };

  const icon = statusIcons[agent.status] ?? "·";
  const color = statusColors[agent.status] ?? "white";

  return (
    <Box>
      <Text color={selected ? "cyan" : undefined}>
        {selected ? "▸ " : "  "}
      </Text>
      <Text color={color}>{icon} </Text>
      <Text bold={selected} color={selected ? "white" : "gray"}>
        {agent.name}
      </Text>
    </Box>
  );
}