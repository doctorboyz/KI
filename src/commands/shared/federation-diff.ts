/**
 * federation-diff.ts — computeSyncDiff pure logic.
 * No I/O, no network — fully unit-testable.
 */

import type { PeerIdentity, SyncDiff } from "./federation-identity";

/**
 * Compute what a sync would do without touching config or network.
 *
 * Rules:
 *  - 'local' routes are sacrosanct (never flag as conflict or stale)
 *  - A route pointing at our own localNode is treated like 'local'
 *  - Unreachable peers are skipped entirely — their routes are left alone
 *    because we can't prove anything about them right now
 *  - A new kappa on a reachable peer → add (unless already routed)
 *  - Existing route X → peer.node X, kappa still hosted → no-op (not in diff)
 *  - Existing route X → peer.node X, kappa no longer hosted → stale
 *  - Existing route X → but peer Y also claims it → conflict (first peer wins)
 */
export function computeSyncDiff(
  localAgents: Record<string, string>,
  peerIdentities: PeerIdentity[],
  localNode: string,
): SyncDiff {
  const diff: SyncDiff = { add: [], stale: [], conflict: [], unreachable: [] };

  const liveByNode = new Map<string, Set<string>>();
  const peerNameByNode = new Map<string, string>();

  for (const p of peerIdentities) {
    if (!p.reachable) {
      diff.unreachable.push({ peerName: p.peerName, url: p.url, error: p.error });
      continue;
    }
    // First peer wins on duplicate node name
    if (!liveByNode.has(p.node)) {
      liveByNode.set(p.node, new Set(p.agents));
      peerNameByNode.set(p.node, p.peerName);
    }
  }

  // ADD / CONFLICT — walk every live kappa.
  // Iterate in peerIdentities input order so "first peer wins" when two
  // different nodes both claim the same kappa.
  const claimedByFirst = new Set<string>();
  for (const p of peerIdentities) {
    if (!p.reachable) continue;
    const peerName = peerNameByNode.get(p.node);
    if (peerName !== p.peerName) continue; // a later duplicate node entry — already processed
    for (const kappa of p.agents) {
      if (claimedByFirst.has(kappa)) continue; // another peer already claimed this kappa
      claimedByFirst.add(kappa);
      if (!(kappa in localAgents)) {
        diff.add.push({ kappa, peerNode: p.node, fromPeer: peerName });
        continue;
      }
      const current = localAgents[kappa];
      if (current === "local" || current === localNode || current === p.node) {
        continue;
      }
      diff.conflict.push({
        kappa,
        current,
        proposed: p.node,
        fromPeer: peerName,
      });
    }
  }

  // STALE — walk every local route that points at a *reachable* peer node
  for (const [kappa, node] of Object.entries(localAgents)) {
    if (node === "local" || node === localNode) continue;
    const live = liveByNode.get(node);
    if (live && !live.has(kappa)) {
      diff.stale.push({ kappa, peerNode: node });
    }
  }

  return diff;
}
