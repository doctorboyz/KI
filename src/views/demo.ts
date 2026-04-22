import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { AOI_ROOT } from "../core/paths";

export const demoView = new Hono();

demoView.get("/", serveStatic({ root: `${AOI_ROOT}/demo`, path: "/index.html" }));
demoView.get("/*", serveStatic({ root: AOI_ROOT }));
