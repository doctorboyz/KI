/**
 * aoi plugins ls/info/install/remove
 * User-facing CLI for managing installed plugin packages.
 *
 * Subcommands:
 *   plugins / plugins ls      — table: name | version | surfaces | dir
 *   plugins info <name>       — full manifest + resolved paths, warn if wasm missing
 *   plugins install <path>    — validate via parseManifest, copy to ~/.aoi/plugins/<name>/
 *   plugins remove <name>     — archive to /tmp/aoi-plugin-<name>-<ts>/ (Nothing Deleted)
 *
 * AOI_PLUGIN_HOME env var overrides install destination (useful for tests).
 */

import type { LoadedPlugin } from "../../../plugin/types";
import { discoverPackages } from "../../../plugin/registry";
import { doLs, doInfo } from "./plugins-ls-info";
import { doInstall, doRemove } from "./plugins-install";
import { doProfile, doNuke } from "./plugins-profile";
import { doEnable, doDisable } from "./plugins-toggle";

export { doLs, doInfo } from "./plugins-ls-info";
export { doInstall, doRemove } from "./plugins-install";
export { doProfile, doNuke } from "./plugins-profile";
export { doEnable, doDisable } from "./plugins-toggle";
export { archiveToTmp, surfaces, shortenHome, printTable } from "./plugins-ui";

type Flags = {
  _: string[];
  "--json"?: boolean;
  "--force"?: boolean;
  "--all"?: boolean;
  [key: string]: unknown;
};

/**
 * Entry point for `aoi plugins <sub> [args] [flags]`.
 * @param discover - injectable for tests; defaults to discoverPackages
 */
export async function cmdPlugins(
  sub: string,
  _rawArgs: string[],
  flags: Flags,
  discover: () => LoadedPlugin[] = discoverPackages,
): Promise<void> {
  const name = flags._[0];
  switch (sub) {
    case "ls":
    case "list":
      return doLs(flags["--json"] ?? false, flags["--all"] ?? false, discover);
    case "info":
      if (!name) {
        console.error("usage: aoi plugins info <name>");
        process.exit(1);
      }
      return doInfo(name, discover);
    case "install":
      if (!name) {
        console.error("usage: aoi plugins install <path> [--force]");
        process.exit(1);
      }
      return doInstall(name, flags["--force"] ?? false);
    case "remove":
    case "uninstall":
    case "rm":
      if (!name) {
        console.error("usage: aoi plugins remove <name>");
        process.exit(1);
      }
      return doRemove(name, discover);
    case "enable": {
      if (!name) { console.error("usage: aoi plugin enable <name>"); process.exit(1); }
      return doEnable(name);
    }
    case "disable": {
      if (!name) { console.error("usage: aoi plugin disable <name>"); process.exit(1); }
      return doDisable(name);
    }
    case "lean":
      return doProfile("core", discover);
    case "standard":
      return doProfile("standard", discover);
    case "full":
      return doProfile("full", discover);
    case "nuke":
      return doNuke();
    default:
      return doLs(flags["--json"] ?? false, flags["--all"] ?? false, discover);
  }
}
