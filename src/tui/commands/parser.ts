import type { SlashCommand, CommandContext, CommandResult } from "../types/commands";

export function parseCommand(input: string): { name: string; args: string[] } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const parts = trimmed.slice(1).split(/\s+/);
  if (parts.length === 0 || !parts[0]) return null;

  return {
    name: parts[0],
    args: parts.slice(1),
  };
}