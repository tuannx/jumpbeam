import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders product metadata and client shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /JumpBeam/);
  assert.match(html, /Pop the Bubbles on your TV/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("keeps privacy and game invariants in the implementation", async () => {
  const source = await readFile(new URL("app/jumpbeam-app.tsx", root), "utf8");
  assert.match(source, /TRACKED_LANDMARKS = \[0, 15, 16, 27, 28, 11, 12, 23, 24\]/);
  assert.match(source, /ROUND_MS = 60_000/);
  assert.match(source, /reliable: false/);
  assert.match(source, /peer\.call\([^,]+, stream\)/);
  assert.match(source, /call\.answer\(\)/);
  assert.match(source, /encrypted and streamed directly/i);
  assert.doesNotMatch(source, /connection\.send\([^)]*video/i);
});
