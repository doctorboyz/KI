import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { FLEET_DIR } from "../../../../sdk";

// Auto-discover commands from src/commands/*.ts
// No manual list — add a file, it shows up in completions
const SKIP = new Set(["completions"]); // don't list ourselves
const ALIASES: Record<string, string[]> = {
  comm: ["ls", "peek", "hey"],        // comm.ts exports 3 commands
  fleet: ["fleet"],                     // fleet subcommands handled separately
  "fleet-init": [],                     // accessed via "fleet init"
  sleep: ["sleep"],
  wake: ["wake"],
  done: ["done"],
  "talk-to": ["talk-to"],
};
const EXTRA = ["stop", "serve", "create-view", "about"]; // aliases defined in cli.ts router

function discoverCommands(): string[] {
  try {
    const dir = join(dirname(new URL(import.meta.url).pathname), ".");
    const files = readdirSync(dir).filter(f => f.endsWith(".ts") && !SKIP.has(f.replace(".ts", "")));
    const cmds = new Set<string>();
    for (const f of files) {
      const name = f.replace(".ts", "");
      const aliases = ALIASES[name];
      if (aliases) {
        for (const a of aliases) cmds.add(a);
      } else {
        cmds.add(name);
      }
    }
    for (const e of EXTRA) cmds.add(e);
    return [...cmds].sort();
  } catch {
    // Fallback if dir scan fails (bundled)
    return ["ls", "peek", "hey", "wake", "fleet", "stop", "done", "overview",
      "about", "kappa", "pulse", "view", "tab", "rename", "talk-to",
      "workon", "park", "resume", "inbox", "contacts", "serve"];
  }
}

export async function cmdCompletions(sub: string) {
  if (sub === "commands") {
    console.log(discoverCommands().join(" "));
  } else if (sub === "kappas" || sub === "windows") {
    const fleetDir = FLEET_DIR;
    const names = new Set<string>();
    try {
      for (const f of readdirSync(fleetDir).filter(f => f.endsWith(".json") && !f.endsWith(".disabled"))) {
        const config = JSON.parse(readFileSync(join(fleetDir, f), "utf-8"));
        for (const w of (config.windows || [])) {
          if (sub === "kappas") {
            if (w.name.endsWith("-kappa")) names.add(w.name.replace(/-kappa$/, ""));
          } else {
            names.add(w.name);
          }
        }
      }
    } catch { /* expected: tmux may not be running */ }
    console.log([...names].sort().join("\n"));
  } else if (sub === "fleet") {
    console.log("init ls renumber validate sync");
  } else if (sub === "pulse") {
    console.log("add ls list");
  }
}
