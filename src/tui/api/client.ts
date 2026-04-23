import { getKiUrl } from "../utils/constants";

export class KiApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? getKiUrl();
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
    return this.request<{ sessions: import("../types/ki").Session[] }>(`/api/sessions${params}`);
  }

  async getFeed(limit = 100, kappa?: string) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (kappa) params.set("kappa", kappa);
    return this.request<import("../types/ki").FeedResponse>(`/api/feed?${params}`);
  }

  async getFleetConfig() {
    return this.request<import("../types/ki").FleetConfigResponse>("/api/fleet-config");
  }

  async getFleet() {
    return this.request<import("../types/ki").FleetResponse>("/api/fleet");
  }

  async getFederationStatus() {
    return this.request<import("../types/ki").FederationStatus>("/api/federation/status");
  }

  async getIdentity() {
    return this.request<import("../types/ki").Identity>("/api/identity");
  }

  async getCapture(target: string) {
    return this.request<import("../types/ki").CaptureResponse>(`/api/capture?target=${encodeURIComponent(target)}`);
  }

  async getMirror(target: string, lines = 40) {
    return this.request<import("../types/ki").MirrorResponse>(`/api/mirror?target=${encodeURIComponent(target)}&lines=${lines}`);
  }

  async wake(body: import("../types/ki").WakeBody) {
    return this.request<{ ok: boolean }>("/api/wake", { method: "POST", body: JSON.stringify(body) });
  }

  async sleep(body: import("../types/ki").SleepBody) {
    return this.request<{ ok: boolean }>("/api/sleep", { method: "POST", body: JSON.stringify(body) });
  }

  async send(body: import("../types/ki").SendBody) {
    return this.request<{ ok: boolean }>("/api/send", { method: "POST", body: JSON.stringify(body) });
  }

  async peerExec(body: import("../types/ki").PeerExecBody) {
    return this.request<{ ok: boolean; result?: string }>("/api/peer/exec", { method: "POST", body: JSON.stringify(body) });
  }
}