#!/usr/bin/env bun
import { render } from "ink";
import React from "react";
import { App } from "./app";

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "tui" || args[0] === "office") {
  if (!process.stdin.isTTY) {
    console.error("Error: AOI TUI requires an interactive terminal (TTY).");
    console.error("Run 'aoi help' for non-interactive commands.");
    process.exit(1);
  }
  render(React.createElement(App));
} else if (args[0] === "version" || args[0] === "-v" || args[0] === "--version") {
  console.log("aoi v0.1.0");
} else if (args[0] === "help" || args[0] === "-h" || args[0] === "--help") {
  console.log(`AOI — Agent Office Interface

Usage: aoi [command]

Commands:
  aoi            Start TUI (default)
  aoi tui        Start TUI
  aoi help       Show help
  aoi version    Show version

TUI Key Bindings:
  ↑/k           Select previous agent
  ↓/j           Select next agent
  Enter         Open action menu
  /             Enter command mode
  f             Toggle feed filter
  q             Quit

Slash Commands:
  /wake <target>     Wake an agent
  /sleep <target>    Sleep an agent
  /bud <name>        Create new Oracle bud
  /done <target>     Mark agent as done
  /talk-to <oracle>  Send message to agent
  /send <target>     Send message to agent
  /rrr               Trigger retrospective
  /recap             Trigger recap
  /team-agents       Spawn team agents
  /fleet             Show fleet status
  /ls                List sessions
  /federation        Show peer connectivity
  /health            Check node health
  /peek <target>     Capture agent output
  /warp <peer>       Execute on remote peer
`);
} else {
  console.log(`Unknown command: ${args[0]}`);
  console.log("Run `aoi help` for usage.");
  process.exit(1);
}