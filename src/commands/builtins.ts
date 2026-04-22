import type { SlashCommand, CommandContext, CommandResult } from "../types/commands";
import { MawApiClient } from "../api/client";

function api(ctx: CommandContext): MawApiClient {
  return new MawApiClient(ctx.apiBase);
}

export const builtins: SlashCommand[] = [
  {
    name: "wake",
    description: "Wake an oracle agent",
    usage: "/wake <target>",
    category: "agent",
    handler: async (args, ctx) => {
      const target = args[0];
      if (!target) return { ok: false, error: "Usage: /wake <target>" };
      try {
        await api(ctx).wake({ target });
        return { ok: true, message: `Woke ${target}` };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
  },
  {
    name: "sleep",
    description: "Sleep an oracle agent",
    usage: "/sleep <target>",
    category: "agent",
    handler: async (args, ctx) => {
      const target = args[0];
      if (!target) return { ok: false, error: "Usage: /sleep <target>" };
      try {
        await api(ctx).sleep({ target });
        return { ok: true, message: `Slept ${target}` };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
  },
  {
    name: "bud",
    description: "Create a new Oracle bud",
    usage: "/bud <name>",
    category: "agent",
    handler: async (args, ctx) => {
      const name = args[0];
      if (!name) return { ok: false, error: "Usage: /bud <name>" };
      try {
        await api(ctx).wake({ target: name, task: "bud" });
        return { ok: true, message: `Budding ${name}` };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
  },
  {
    name: "done",
    description: "Mark agent as done",
    usage: "/done <target>",
    category: "agent",
    handler: async (args, ctx) => {
      const target = args[0];
      if (!target) return { ok: false, error: "Usage: /done <target>" };
      try {
        await api(ctx).sleep({ target });
        return { ok: true, message: `Done ${target}` };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
  },
  {
    name: "talk-to",
    description: "Send message to an agent",
    usage: "/talk-to <oracle> <message>",
    category: "comms",
    handler: async (args, ctx) => {
      const target = args[0];
      const text = args.slice(1).join(" ");
      if (!target || !text) return { ok: false, error: "Usage: /talk-to <oracle> <message>" };
      try {
        await api(ctx).send({ target, text });
        return { ok: true, message: `Sent to ${target}` };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
  },
  {
    name: "send",
    description: "Send message to an agent",
    usage: "/send <target> <message>",
    category: "comms",
    handler: async (args, ctx) => {
      const target = args[0];
      const text = args.slice(1).join(" ");
      if (!target || !text) return { ok: false, error: "Usage: /send <target> <message>" };
      try {
        await api(ctx).send({ target, text });
        return { ok: true, message: `Sent to ${target}` };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
  },
  {
    name: "rrr",
    description: "Trigger retrospective on selected agent",
    usage: "/rrr",
    category: "memory",
    handler: async (_args, ctx) => {
      const target = ctx.selectedAgent;
      if (!target) return { ok: false, error: "No agent selected" };
      try {
        await api(ctx).send({ target, text: "/rrr" });
        return { ok: true, message: `Sent /rrr to ${target}` };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
  },
  {
    name: "recap",
    description: "Trigger recap on selected agent",
    usage: "/recap",
    category: "memory",
    handler: async (_args, ctx) => {
      const target = ctx.selectedAgent;
      if (!target) return { ok: false, error: "No agent selected" };
      try {
        await api(ctx).send({ target, text: "/recap" });
        return { ok: true, message: `Sent /recap to ${target}` };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
  },
  {
    name: "team-agents",
    description: "Spawn team agents on selected oracle",
    usage: "/team-agents",
    category: "fleet",
    handler: async (_args, ctx) => {
      const target = ctx.selectedAgent;
      if (!target) return { ok: false, error: "No agent selected" };
      try {
        await api(ctx).send({ target, text: "/team-agents" });
        return { ok: true, message: `Sent /team-agents to ${target}` };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
  },
  {
    name: "fleet",
    description: "Show fleet status",
    usage: "/fleet",
    category: "fleet",
    handler: async (_args, ctx) => {
      try {
        const res = await api(ctx).getFleetConfig();
        const names = res.configs.map((c) => Object.keys(c)).flat();
        return { ok: true, message: `Fleet: ${names.join(", ") || "empty"}` };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
  },
  {
    name: "ls",
    description: "List sessions",
    usage: "/ls",
    category: "system",
    handler: async (_args, ctx) => {
      try {
        const res = await api(ctx).getSessions();
        const lines = res.sessions.map((s) => `${s.name} (${s.windows.length} windows)`).join("\n");
        return { ok: true, message: lines || "No sessions" };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
  },
  {
    name: "federation",
    description: "Show peer connectivity",
    usage: "/federation",
    category: "system",
    handler: async (_args, ctx) => {
      try {
        const res = await api(ctx).getFederationStatus();
        const peers = res.peers.map((p) => `${p.node ?? p.url} ${p.reachable ? "✓" : "✕"}`).join("\n");
        return { ok: true, message: `Node: ${res.localUrl}\nPeers: ${peers || "none"}` };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
  },
  {
    name: "health",
    description: "Check node health",
    usage: "/health",
    category: "system",
    handler: async (_args, ctx) => {
      try {
        const res = await api(ctx).getIdentity();
        return { ok: true, message: `Node: ${res.node} | v${res.version} | Agents: ${res.agents.join(", ") || "none"}` };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
  },
  {
    name: "peek",
    description: "Capture agent output",
    usage: "/peek <target>",
    category: "system",
    handler: async (args, ctx) => {
      const target = args[0] ?? ctx.selectedAgent;
      if (!target) return { ok: false, error: "Usage: /peek <target>" };
      try {
        const res = await api(ctx).getMirror(target);
        return { ok: true, message: res.lines.join("\n") };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
  },
  {
    name: "warp",
    description: "Execute command on remote peer",
    usage: "/warp <peer> <command>",
    category: "comms",
    handler: async (args, ctx) => {
      const peer = args[0];
      const cmd = args.slice(1).join(" ");
      if (!peer || !cmd) return { ok: false, error: "Usage: /warp <peer> <command>" };
      try {
        const res = await api(ctx).peerExec({ peer, cmd, args: [] });
        return { ok: true, message: res.result ?? `Executed on ${peer}` };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
  },
];