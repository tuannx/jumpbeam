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
  assert.match(source, /TRACKED_LANDMARKS = \[0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28\]/);
  assert.match(source, /ROUND_MS = 60_000/);
  assert.match(source, /SOLO_GOAL = 30/);
  assert.match(source, /type Mode = "home" \| "laptop" \| "tv" \| "phone"/);
  assert.match(source, /cameraMode === "local"/);
  assert.match(source, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(source, /Play on this laptop/);
  assert.match(source, /tasks-vision@0\.10\.35\/wasm/);
  assert.match(source, /falling back to CPU/);
  assert.doesNotMatch(source, /tasks-vision@0\.10\.22\/wasm/);
  assert.match(source, /SOLO QUEST/);
  assert.match(source, /one player's whole body in frame/);
  assert.match(source, /reliable: false/);
  assert.match(source, /peer\.call\([^,]+, stream\)/);
  assert.match(source, /call\.answer\(\)/);
  assert.match(source, /encrypted and streamed directly/i);
  assert.doesNotMatch(source, /connection\.send\([^)]*video/i);
});

test("caps and cleans up additive impact effects", async () => {
  const source = await readFile(new URL("app/juice-effects.tsx", root), "utf8");
  assert.match(source, /const MAX_PARTICLES = 144/);
  assert.match(source, /globalCompositeOperation = "lighter"/);
  assert.match(source, /this\.cursor = \(this\.cursor \+ 1\) % MAX_PARTICLES/);
  assert.match(source, /cancelAnimationFrame\(frame\)/);
  assert.match(source, /observer\.disconnect\(\)/);
});
