import type { SlashCommand, CommandContext, CommandResult } from "../types/commands";
import { builtins } from "./builtins";

class CommandRegistry {
  private commands: Map<string, SlashCommand> = new Map();

  constructor(commands: SlashCommand[]) {
    for (const cmd of commands) {
      this.commands.set(cmd.name, cmd);
    }
  }

  get(name: string): SlashCommand | undefined {
    return this.commands.get(name);
  }

  all(): SlashCommand[] {
    return [...this.commands.values()];
  }

  byCategory(category: SlashCommand["category"]): SlashCommand[] {
    return this.all().filter((c) => c.category === category);
  }

  matching(prefix: string): SlashCommand[] {
    const lower = prefix.toLowerCase();
    return this.all().filter((c) => c.name.startsWith(lower));
  }

  async execute(input: string, ctx: CommandContext): Promise<CommandResult> {
    const parsed = input.trim();
    if (!parsed.startsWith("/")) {
      return { ok: false, error: "Commands start with /" };
    }

    const parts = parsed.slice(1).split(/\s+/);
    const name = parts[0];
    const args = parts.slice(1);

    const cmd = this.commands.get(name);
    if (!cmd) {
      return { ok: false, error: `Unknown command: /${name}` };
    }

    return cmd.handler(args, ctx);
  }
}

export const registry = new CommandRegistry(builtins);