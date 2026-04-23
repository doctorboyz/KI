/**
 * registry-kappa-types — KappaEntry, RegistryCache types and shared constants.
 */

import { join } from "path";
import { CONFIG_DIR } from "../paths";

export interface KappaEntry {
  org: string;
  repo: string;
  name: string;            // display name: strip trailing -kappa
  local_path: string;
  has_psi: boolean;
  has_fleet_config: boolean;
  budded_from: string | null;
  budded_at: string | null;
  federation_node: string | null;
  detected_at: string;     // ISO8601
}

export interface RegistryCache {
  schema: 1;
  local_scanned_at: string;
  ghq_root: string;
  kappas: KappaEntry[];
}

export const CACHE_FILE = join(CONFIG_DIR, "kappas.json");
export const STALE_HOURS = 1;
