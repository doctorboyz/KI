/**
 * Extracted respawn dedup logic for testing.
 * Mirrors the collision/dedup logic from fleet.ts respawnMissingWorktrees()
 * and wake.ts worktree respawn block.
 */

export interface RespawnOpts {
  kappaName: string;
  registeredNames: Set<string>;
  runningWindows: string[];
  worktreeSuffixes: string[];
}

export interface RespawnResult {
  created: string[];
  skipped: string[];
}

/** Buggy version — collision fallback always renames, bypassing dedup */
export function respawnBuggy(opts: RespawnOpts): RespawnResult {
  const { kappaName, registeredNames, runningWindows, worktreeSuffixes } = opts;
  const usedNames = new Set([...registeredNames, ...runningWindows]);
  const created: string[] = [];
  const skipped: string[] = [];

  for (const suffix of worktreeSuffixes) {
    const taskPart = suffix.replace(/^\d+-/, "");
    let windowName = `${kappaName}-${taskPart}`;

    if (usedNames.has(windowName)) {
      windowName = `${kappaName}-${suffix}`;
    }

    const altName = `${kappaName}-${suffix}`;
    if (registeredNames.has(windowName) || registeredNames.has(altName)) {
      skipped.push(suffix);
      continue;
    }
    if (runningWindows.includes(windowName) || runningWindows.includes(altName)) {
      skipped.push(suffix);
      continue;
    }

    usedNames.add(windowName);
    created.push(windowName);
  }

  return { created, skipped };
}

/** Fixed version — skip when collision is with fleet config or running window */
export function respawnFixed(opts: RespawnOpts): RespawnResult {
  const { kappaName, registeredNames, runningWindows, worktreeSuffixes } = opts;
  const usedNames = new Set([...registeredNames, ...runningWindows]);
  const created: string[] = [];
  const skipped: string[] = [];

  for (const suffix of worktreeSuffixes) {
    const taskPart = suffix.replace(/^\d+-/, "");
    let windowName = `${kappaName}-${taskPart}`;

    if (usedNames.has(windowName)) {
      if (registeredNames.has(windowName) || runningWindows.includes(windowName)) {
        skipped.push(suffix);
        continue;
      }
      windowName = `${kappaName}-${suffix}`;
    }

    const altName = `${kappaName}-${suffix}`;
    if (registeredNames.has(windowName) || registeredNames.has(altName)) {
      skipped.push(suffix);
      continue;
    }
    if (runningWindows.includes(windowName) || runningWindows.includes(altName)) {
      skipped.push(suffix);
      continue;
    }

    usedNames.add(windowName);
    created.push(windowName);
  }

  return { created, skipped };
}
