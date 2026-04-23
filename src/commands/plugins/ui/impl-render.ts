/**
 * `ki ui` — output rendering, argument parsing, and CLI dispatcher.
 */

import {
  LENS_PORT,
  KI_PORT,
  type UiOptions,
  isUiDistInstalled,
  findKiUiSrcDir,
  buildDevCommand,
  buildLensUrl,
  resolvePeerHostPort,
  justHost,
  buildTunnelCommand,
} from "./impl-helpers";
import { parseFlags } from "../../../cli-src/parse-args";

/**
 * Render the full output that `ki ui` prints, given the parsed options.
 * Returns a single string with newlines so tests can assert on it without
 * having to capture stdout. The CLI just prints this verbatim.
 */
export function renderUiOutput(opts: UiOptions): string {
  // Detect Shape A: if dist is installed, use ki-js port (3456) instead of vite (5173)
  const distInstalled = isUiDistInstalled();
  const lensPort = distInstalled ? KI_PORT : LENS_PORT;

  // --dev mode: print the vite dev server command
  if (opts.dev) {
    const srcDir = findKiUiSrcDir();
    if (!srcDir) {
      return [
        `# ki-ui source not found. Searched:`,
        `#   - ghq list (no match for /ki-ui)`,
        `#   - sibling directory of ki-js`,
        `#   - $KI_UI_SRC env var`,
        `#`,
        `# Clone it: ghq get https://github.com/doctorboyz/ki-ui`,
        `# Or set: export KI_UI_SRC=/path/to/ki-ui`,
      ].join("\n");
    }
    const devCmd = buildDevCommand(srcDir);
    const url = buildLensUrl({ threeD: opts.threeD, port: LENS_PORT });
    return [
      `# Start vite dev server (HMR on :${LENS_PORT}, proxy /api → ki serve on :${KI_PORT}):`,
      devCmd,
      ``,
      `# Then open:`,
      url,
      ``,
      `# Requires ki serve running on :${KI_PORT} for API/WS proxy.`,
      `# Edit files in ${srcDir} — vite hot-reloads instantly.`,
      `# Ctrl+C stops the dev server. Static :${KI_PORT} keeps serving if installed.`,
    ].join("\n");
  }

  // --tunnel mode
  if (opts.tunnel) {
    if (!opts.peer) {
      return [
        "# usage: ki ui --tunnel <peer>",
        "# example: ki ui --tunnel kappa-world",
      ].join("\n");
    }
    const hostPort = resolvePeerHostPort(opts.peer);
    if (!hostPort) {
      return [
        `# unknown peer: ${opts.peer}`,
        `# expected a named peer (config.namedPeers) or literal host:port`,
      ].join("\n");
    }
    const host = justHost(hostPort);
    const user = process.env.USER || "neo";
    const sshCmd = buildTunnelCommand({ user, host });
    const url = buildLensUrl({ threeD: opts.threeD, port: lensPort });
    return [
      `# Run this on your local machine to forward both lens (${lensPort}) and ki-js (${KI_PORT}):`,
      sshCmd,
      ``,
      `# Then open in your browser:`,
      url,
      ``,
      `# Stop the tunnel with Ctrl+C in the SSH terminal.`,
      ...(distInstalled ? [``, `# (Shape A — ki-ui dist served from ki-js on port ${KI_PORT})`] : []),
    ].join("\n");
  }

  // Bare or <peer> mode — just print the URL
  if (opts.peer) {
    const hostPort = resolvePeerHostPort(opts.peer);
    if (!hostPort) {
      return [
        `# unknown peer: ${opts.peer}`,
        `# expected a named peer (config.namedPeers) or literal host:port`,
      ].join("\n");
    }
    return buildLensUrl({ remoteHost: hostPort, threeD: opts.threeD, port: lensPort });
  }

  return buildLensUrl({ threeD: opts.threeD, port: lensPort });
}

// ---- Arg parser ----------------------------------------------------------

const UI_SUBCOMMANDS = ["install", "status"] as const;
type UiSubcommand = typeof UI_SUBCOMMANDS[number];

export function parseUiArgs(args: string[]): UiOptions {
  // Detect positional subcommand as first arg (before any flags)
  const firstArg = args[0];
  const subcommand = UI_SUBCOMMANDS.includes(firstArg as UiSubcommand)
    ? (firstArg as UiSubcommand)
    : undefined;
  const restArgs = subcommand ? args.slice(1) : args;

  const flags = parseFlags(restArgs, {
    "--install": Boolean,
    "--tunnel": Boolean,
    "--dev": Boolean,
    "--3d": Boolean,
    "--version": String,
  }, 0);

  // permissive mode puts unknown flags into _ too;
  // peer must be first non-flag positional
  const peer = flags._.find((a: string) => !a.startsWith("--"));

  return {
    peer,
    install: flags["--install"],
    tunnel: flags["--tunnel"],
    dev: flags["--dev"],
    threeD: flags["--3d"],
    subcommand,
    version: flags["--version"],
  };
}

// ---- Public entry --------------------------------------------------------

export async function cmdUi(args: string[]): Promise<void> {
  const opts = parseUiArgs(args);

  if (opts.subcommand === "install" || opts.install) {
    const { cmdUiInstall } = await import("./ui-install");
    // --version takes precedence; fall back to peer (backward compat with --install <version>)
    await cmdUiInstall(opts.version ?? opts.peer);
    return;
  }

  if (opts.subcommand === "status") {
    const { cmdUiStatus } = await import("./ui-install");
    await cmdUiStatus();
    return;
  }

  console.log(renderUiOutput(opts));
}
