#!/usr/bin/env bun
// AOI — Agent Office Interface
// CLI entry: aoi <command>
//   aoi          → start TUI (default)
//   aoi serve    → start API + WS server
//   aoi tui      → start TUI client
//   aoi <cmd>    → run CLI command (wake, sleep, bud, etc.)

process.env.AOI_CLI = "1";

// #566: apply --as <name> BEFORE any state-touching import
import { applyInstancePreset } from "./cli-src/cli/instance-preset";
applyInstancePreset();

const rawArgs = process.argv.slice(2);
const cmd = rawArgs[0]?.toLowerCase();

// TUI mode — start Ink terminal UI
if (!cmd || cmd === "tui" || cmd === "office") {
  if (!process.stdin.isTTY) {
    console.error("Error: AOI TUI requires an interactive terminal (TTY).");
    console.error("Run 'aoi help' for non-interactive commands.");
    process.exit(1);
  }
  const { render } = await import("ink");
  const React = await import("react");
  const { App } = await import("./tui/app");
  render(React.createElement(App));
  process.exit(0);
}

// Version
if (cmd === "--version" || cmd === "-v" || cmd === "version") {
  const { getVersionString } = await import("./cli-src/cli/cmd-version");
  console.log(getVersionString());
  process.exit(0);
}

// Help
if (cmd === "--help" || cmd === "-h" || cmd === "help") {
  console.log(`AOI — Agent Office Interface

Usage: aoi [command]

Commands:
  aoi              Start TUI (default)
  aoi tui          Start TUI
  aoi serve        Start API + WebSocket server
  aoi help         Show this help
  aoi version      Show version

All aoi CLI commands are also available:
  aoi wake <oracle>   Wake an agent
  aoi sleep <oracle>  Sleep an agent
  aoi bud <name>      Create new Oracle bud
  aoi done <window>   Mark window as done
  aoi talk-to <oracle> <msg>  Send message
  aoi peek <oracle>   View agent output
  aoi hey <oracle> <msg>      Quick message
  aoi fleet           Show fleet status
  aoi federation      Show peer connectivity
  aoi health          Check health
  ... and 60+ more commands

TUI Key Bindings:
  ↑/k           Select previous agent
  ↓/j           Select next agent
  Enter         Open action menu
  /             Enter command mode
  f             Toggle feed filter
  q             Quit
`);
  process.exit(0);
}

// Serve mode — start API + WebSocket server
if (cmd === "serve" || cmd === "server") {
  // Delegate to the core server startup
  const { startServer } = await import("./core/server");
  await startServer();
  process.exit(0);
}

// All other commands — delegate to original CLI router
// Import the full CLI logic from the aoi-derived code
const { logAudit } = await import("./core/fleet/audit");
const { usage } = await import("./cli-src/cli/usage");
const { routeComm } = await import("./cli-src/cli/route-comm");
const { routeTools } = await import("./cli-src/cli/route-tools");
const { scanCommands, matchCommand, executeCommand } = await import("./cli-src/cli/command-registry");
const { setVerbosityFlags } = await import("./cli-src/cli/verbosity");
const { cmdPeek, cmdSend } = await import("./commands/shared/comm");
const { runBootstrap } = await import("./cli-src/cli/plugin-bootstrap");
const { UserError, isUserError } = await import("./core/util/user-error");
const { AmbiguousMatchError } = await import("./core/runtime/find-window");
const { renderAmbiguousMatch } = await import("./core/util/render-ambiguous");
const { join } = await import("path");
const { homedir } = await import("os");

const VERBOSITY_FLAGS = new Set(["--quiet", "-q", "--silent", "-s"]);
const verbosity: { quiet?: boolean; silent?: boolean } = {};
if (rawArgs.some(a => a === "--quiet" || a === "-q")) verbosity.quiet = true;
if (rawArgs.some(a => a === "--silent" || a === "-s")) verbosity.silent = true;
setVerbosityFlags(verbosity);
const args = rawArgs.filter(a => !VERBOSITY_FLAGS.has(a));

logAudit(cmd || "", args);

async function runCommand(): Promise<void> {
  if (cmd === "update" || cmd === "upgrade") {
    const { runUpdate } = await import("./cli-src/cli/cmd-update");
    await runUpdate(args);
    return;
  }

  // Auto-bootstrap plugins
  const pluginDir = join(homedir(), ".aoi", "plugins");
  await runBootstrap(pluginDir, import.meta.dir);
  await scanCommands(pluginDir, "user");

  // Core routes
  const handled =
    await routeComm(cmd, args) ||
    await routeTools(cmd, args);

  if (handled) return;

  // Plugin commands
  const pluginMatch = matchCommand(args);
  if (pluginMatch) {
    await executeCommand(pluginMatch.desc, pluginMatch.remaining);
    return;
  }

  // Plugin registry
  const { discoverPackages, invokePlugin } = await import("./plugin/registry");
  const { resolvePluginMatch } = await import("./cli-src/cli/dispatch-match");
  const plugins = discoverPackages();

  const cmdName = args.join(" ").toLowerCase();
  const dispatch = resolvePluginMatch(plugins, cmdName);

  if (dispatch.kind === "ambiguous") {
    console.error(`\x1b[31m✗\x1b[0m ambiguous command: ${args[0]}`);
    console.error(`  candidates: ${dispatch.candidates.map(c => `${c.plugin} (${c.name})`).join(", ")}`);
    throw new UserError(`ambiguous command: ${args[0]}`);
  }

  if (dispatch.kind === "match") {
    const matchedWords = dispatch.matchedName.split(/\s+/).filter(Boolean).length;
    const remaining = args.slice(matchedWords);
    const result = await invokePlugin(dispatch.plugin, { source: "cli", args: remaining });
    if (result.ok && result.output) console.log(result.output);
    else if (!result.ok) { console.error(result.error); process.exit(1); }
    return;
  }

  // Unknown command fallback — try oracle name
  const { listCommands } = await import("./cli-src/cli/command-registry");
  const CORE_ROUTES = [
    "hey", "send", "tell",
    "plugins", "plugin", "artifacts", "artifact",
    "agents", "agent", "audit", "serve",
    "update", "upgrade", "version", "tui",
  ];
  const knownCommands: string[] = [...CORE_ROUTES];
  for (const p of plugins) {
    if (!p.manifest.cli) continue;
    knownCommands.push(p.manifest.cli.command);
    for (const a of p.manifest.cli.aliases ?? []) knownCommands.push(a);
  }
  for (const c of listCommands()) {
    const names = Array.isArray(c.name) ? c.name : [c.name];
    for (const n of names) knownCommands.push(n);
  }
  const isKnownCommand = knownCommands.some(n => n.toLowerCase() === cmd);

  if (!isKnownCommand) {
    const ORACLE_NAME_SHAPE = /^[a-z0-9][a-z0-9:_-]*$/i;
    if (ORACLE_NAME_SHAPE.test(args[0])) {
      const { listSessions } = await import("./sdk");
      const sessions = await listSessions().catch(() => [] as Awaited<ReturnType<typeof listSessions>>);
      const target = args[0].toLowerCase();
      const isOracle = sessions.some(s => {
        const name = s.name.toLowerCase();
        return name === target || name.replace(/^\d+-/, "") === target;
      });
      if (isOracle) {
        // Oracle shorthand
        if (args.length >= 2) {
          const f = args.includes("--force");
          const m = args.slice(1).filter(a => a !== "--force");
          await cmdSend(args[0], m.join(" "), f);
        } else {
          await cmdPeek(args[0]);
        }
        return;
      }
    }

    console.error(`\x1b[31m✗\x1b[0m unknown command: ${args[0]}`);
    console.error(`  run 'aoi --help' to see available commands`);
    throw new UserError(`unknown command: ${args[0]}`);
  }
}

runCommand().catch((e: unknown) => {
  if (isUserError(e)) {
    process.exit(1);
  }
  if (e instanceof AmbiguousMatchError) {
    console.error(renderAmbiguousMatch(e, args));
    process.exit(1);
  }
  console.error(e);
  process.exit(1);
});