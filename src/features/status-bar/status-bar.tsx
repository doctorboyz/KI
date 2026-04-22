import React from "react";
import { Box, Text } from "ink";
import { useConnectionStore } from "../../stores/connection-store";

export function StatusBar() {
  const wsStatus = useConnectionStore((s) => s.wsStatus);
  const node = useConnectionStore((s) => s.node);
  const agentCount = useConnectionStore((s) => s.agentCount);

  const statusColor = wsStatus === "connected" ? "green" : wsStatus === "reconnecting" ? "yellow" : "red";
  const statusText = wsStatus === "connected" ? "●" : wsStatus === "reconnecting" ? "◐" : "○";

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1}>
      <Text bold color="cyan">
        AOI
      </Text>
      <Text> </Text>
      <Text color={statusColor}>{statusText}</Text>
      <Text color={wsStatus === "connected" ? "green" : "yellow"}>
        {" "}
        {wsStatus}
      </Text>
      <Text dimColor> │ </Text>
      <Text>node:{node}</Text>
      <Text dimColor> │ </Text>
      <Text>
        {agentCount} agent{agentCount !== 1 ? "s" : ""}
      </Text>
      <Text dimColor> │ </Text>
      <Text dimColor>/ for commands · Enter for actions · q to quit</Text>
    </Box>
  );
}