import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { useCommandStore } from "../../stores/command-store";
import { useAgentStore } from "../../stores/agent-store";
import { registry } from "../../commands/registry";
import { Autocomplete } from "./autocomplete";
import { getKiUrl } from "../../utils/constants";

export function CommandBar() {
  const mode = useCommandStore((s) => s.mode);
  const buffer = useCommandStore((s) => s.buffer);
  const lastResult = useCommandStore((s) => s.lastResult);
  const autocompleteIndex = useCommandStore((s) => s.autocompleteIndex);

  const commandPrefix = buffer.startsWith("/") ? buffer.slice(1).split(/\s/)[0] : "";
  const matches = commandPrefix ? registry.matching(commandPrefix) : [];

  if (mode !== "command") {
    return lastResult ? (
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color={lastResult.ok ? "green" : "red"}>
          {lastResult.ok ? "✓" : "✕"} {lastResult.ok ? lastResult.message : lastResult.error}
        </Text>
      </Box>
    ) : null;
  }

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="cyan" paddingX={1}>
      <Box flexDirection="column">
        <Autocomplete prefix={commandPrefix} selectedIndex={autocompleteIndex} />
      </Box>
      <Box>
        <Text color="cyan">/</Text>
        <Text>{buffer.startsWith("/") ? buffer.slice(1) : buffer}</Text>
        <Text color="gray">▊</Text>
      </Box>
    </Box>
  );
}