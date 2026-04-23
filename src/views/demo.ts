import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { KI_ROOT } from "../core/paths";

export const demoView = new Hono();

demoView.get("/", serveStatic({ root: `${KI_ROOT}/demo`, path: "/index.html" }));
demoView.get("/*", serveStatic({ root: KI_ROOT }));
