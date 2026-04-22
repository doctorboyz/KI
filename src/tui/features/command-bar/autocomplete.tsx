import React from "react";
import { Box, Text } from "ink";
import { registry } from "../../commands/registry";

interface AutocompleteProps {
  prefix: string;
  selectedIndex: number;
}

export function Autocomplete({ prefix, selectedIndex }: AutocompleteProps) {
  const matches = prefix ? registry.matching(prefix) : registry.all();

  if (matches.length === 0) return null;

  return (
    <Box flexDirection="column">
      {matches.map((cmd, i) => (
        <Box key={cmd.name}>
          <Text color={i === selectedIndex ? "green" : undefined} bold={i === selectedIndex}>
            {i === selectedIndex ? "▸ " : "  "}
            /{cmd.name}
          </Text>
          <Text dimColor> — {cmd.description}</Text>
        </Box>
      ))}
    </Box>
  );
}