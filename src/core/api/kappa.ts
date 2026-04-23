import { Elysia, t} from "elysia";
import { loadConfig } from "../config";

const KAPPA_URL = process.env.KAPPA_URL || loadConfig().kappaUrl;

export const kappaApi = new Elysia();

kappaApi.get("/kappa/search", async ({ query, set}) => {
  const q = query?.q;
  if (!q) { set.status = 400; return { error: "q required" }; }
  const params = new URLSearchParams({ q, mode: query?.mode || "hybrid", limit: query?.limit || "10" });
  if (query?.model) params.set("model", query.model);
  try {
    const res = await fetch(`${KAPPA_URL}/api/search?${params}`);
    return await res.json();
  } catch (e: any) {
    set.status = 502; return { error: `Kappa unreachable: ${e.message}` };
  }
}, {
  query: t.Object({
    q: t.Optional(t.String()),
    mode: t.Optional(t.String()),
    limit: t.Optional(t.String()),
    model: t.Optional(t.String()),
  }),
});

kappaApi.get("/kappa/traces", async ({ query, set}) => {
  const limit = query?.limit || "10";
  try {
    const res = await fetch(`${KAPPA_URL}/api/traces?limit=${limit}`);
    return await res.json();
  } catch (e: any) {
    set.status = 502; return { error: `Kappa unreachable: ${e.message}` };
  }
}, {
  query: t.Object({ limit: t.Optional(t.String()) }),
});

kappaApi.get("/kappa/stats", async ({ set }) => {
  try {
    const res = await fetch(`${KAPPA_URL}/api/stats`);
    return await res.json();
  } catch (e: any) {
    set.status = 502; return { error: `Kappa unreachable: ${e.message}` };
  }
});
