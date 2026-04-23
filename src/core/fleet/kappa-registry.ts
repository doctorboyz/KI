/**
 * Kappa Registry — fleet-wide kappa discovery + cache.
 *
 * Scans ghq root for repos with ψ/ directories (the authoritative signal
 * for "this is an kappa"), merges with fleet config lineage data, and
 * caches to ~/.config/ki/kappas.json.
 *
 * See: doctorboyz/ki#208
 *
 * Sub-modules:
 *   registry-kappa-types.ts        — KappaEntry, RegistryCache types + constants
 *   registry-kappa-cache.ts        — readCache, writeCache, isCacheStale, mergeRegistry
 *   registry-kappa-scan-local.ts   — scanLocal + fleet lineage helpers
 *   registry-kappa-scan-remote.ts  — scanRemote (GitHub API + gh CLI)
 *   registry-kappa-orchestrate.ts  — scanAndCache, scanFull
 */

export type { KappaEntry, RegistryCache } from "./registry-kappa-types";
export { readCache, writeCache, isCacheStale, mergeRegistry } from "./registry-kappa-cache";
export { scanLocal } from "./registry-kappa-scan-local";
export { scanRemote } from "./registry-kappa-scan-remote";
export { scanAndCache, scanFull } from "./registry-kappa-orchestrate";
