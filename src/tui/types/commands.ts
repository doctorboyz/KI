export interface SlashCommand {
  name: string;
  description: string;
  usage: string;
  category: "agent" | "comms" | "memory" | "fleet" | "system";
  handler: (args: string[], ctx: CommandContext) => Promise<CommandResult>;
}

export interface CommandContext {
  selectedAgent: string | null;
  apiBase: string;
}

export type CommandResult =
  | { ok: true; message: string }
  | { ok: false; error: string };