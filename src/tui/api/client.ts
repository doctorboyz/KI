import { getAoiUrl } from "../utils/constants";

export class AoiApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? getAoiUrl();
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "unknown error");
      throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  async getSessions(local = false) {
    const params = local ? "?local=true" : "";
    return this.request<{ sessions: import("../types/aoi").Session[] }>(`/api/sessions${params}`);
  }

  async getFeed(limit = 100, oracle?: string) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (oracle) params.set("oracle", oracle);
    return this.request<import("../types/aoi").FeedResponse>(`/api/feed?${params}`);
  }

  async getFleetConfig() {
    return this.request<import("../types/aoi").FleetConfigResponse>("/api/fleet-config");
  }

  async getFleet() {
    return this.request<import("../types/aoi").FleetResponse>("/api/fleet");
  }

  async getFederationStatus() {
    return this.request<import("../types/aoi").FederationStatus>("/api/federation/status");
  }

  async getIdentity() {
    return this.request<import("../types/aoi").Identity>("/api/identity");
  }

  async getCapture(target: string) {
    return this.request<import("../types/aoi").CaptureResponse>(`/api/capture?target=${encodeURIComponent(target)}`);
  }

  async getMirror(target: string, lines = 40) {
    return this.request<import("../types/aoi").MirrorResponse>(`/api/mirror?target=${encodeURIComponent(target)}&lines=${lines}`);
  }

  async wake(body: import("../types/aoi").WakeBody) {
    return this.request<{ ok: boolean }>("/api/wake", { method: "POST", body: JSON.stringify(body) });
  }

  async sleep(body: import("../types/aoi").SleepBody) {
    return this.request<{ ok: boolean }>("/api/sleep", { method: "POST", body: JSON.stringify(body) });
  }

  async send(body: import("../types/aoi").SendBody) {
    return this.request<{ ok: boolean }>("/api/send", { method: "POST", body: JSON.stringify(body) });
  }

  async peerExec(body: import("../types/aoi").PeerExecBody) {
    return this.request<{ ok: boolean; result?: string }>("/api/peer/exec", { method: "POST", body: JSON.stringify(body) });
  }
}