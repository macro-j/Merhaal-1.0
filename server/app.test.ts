import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app";

let server: Server | undefined;

async function startApp(): Promise<string> {
  server = createApp({ enrich: async plan => plan }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server!.once("listening", resolve);
    server!.once("error", reject);
  });
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  vi.unstubAllEnvs();
  if (server?.listening) {
    await new Promise<void>((resolve, reject) => {
      server!.close(error => (error ? reject(error) : resolve()));
    });
  }
  server = undefined;
});

describe("production API boundaries", () => {
  it("exposes a JSON health response", async () => {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "merhaal-api",
    });
  });

  it("reports a missing Groq key through readiness", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/api/ready`);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "not_ready",
      checks: { api: "ok", ai: "missing" },
    });
  });

  it("becomes ready when the server-side Groq key exists", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/api/ready`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ready",
      checks: { api: "ok", ai: "configured" },
    });
  });

  it("never serves the SPA document for an unknown API route", async () => {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/api/unknown`);

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INTERNAL_ERROR" },
    });
  });
});
