import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import "dotenv/config";
import { createApp } from "./app";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = createApp();

if (process.env.NODE_ENV === "production") {
  const publicDir = path.join(rootDir, "dist", "public");
  app.use(express.static(publicDir));
  app.use((_request, response) => response.sendFile(path.join(publicDir, "index.html")));
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    configFile: path.join(rootDir, "vite.config.ts"),
    root: path.join(rootDir, "client"),
    server: { middlewareMode: true, hmr: false },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Merhaal is running on http://localhost:${port}`);
});
