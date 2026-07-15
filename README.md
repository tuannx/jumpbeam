# JumpBeam

JumpBeam turns a TV and a phone into a controller-free, 60-second movement game for kids. The TV shows **Pop the Bubbles** while the phone detects wrists, ankles, and head position locally.

**Live public MVP:** https://jumpbeam.tuannx87.workers.dev

## MVP flow

1. Open the site on a TV browser (or a laptop connected by HDMI) and choose **Open on TV**.
2. Scan the room QR code with a phone.
3. Allow camera access, prop the phone up in landscape, and step back until the whole body is visible.
4. Move hands and feet to pop bubbles on the TV for 60 seconds.

The phone and TV connect directly through WebRTC DataChannel via PeerJS discovery. Camera frames are never sent. MediaPipe Pose Landmarker runs in the phone browser and sends only five normalized landmarks (nose, wrists, and ankles), capped at 20 updates per second.

## Stack

- Next.js-compatible React app built with vinext/Vite for Cloudflare Workers
- MediaPipe Tasks Vision pose detection (lite model, GPU delegate)
- PeerJS for browser-to-browser room pairing
- `qrcode.react` for pairing QR codes
- Pure CSS/DOM game rendering and collision detection
- OpenAI Sites hosting configuration in `.openai/hosting.json`

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. For a realistic two-device test, use an HTTPS URL because mobile browsers require a secure context for camera access.

## Validation

```bash
npm run build
npm test
npm run lint
```

## Deploy to Cloudflare Workers

After authenticating Wrangler as `tuannx87@gmail.com`, build and publish the public Worker to Cloudflare account `05130ca1f0bdabbab4d08a5d75544e92` with:

```bash
npm run deploy:cloudflare
```

The tests verify production rendering, product metadata, the 60-second round invariant, the exact privacy-preserving landmark set, and that raw video is never sent through the peer connection.

## Architecture

The MVP deliberately keeps a small, clean boundary between:

- **Input adapter:** MediaPipe converts local camera frames into normalized points.
- **Transport adapter:** PeerJS sends `PosePacket` data between devices.
- **Game domain:** the TV owns bubble spawning, collision, score, and timer state.
- **Presentation:** responsive home, pairing, controller, playfield, and result views.

No account, database, analytics, or recorded replay is included in this first version.

## Current limitations

- Peer discovery uses the public PeerJS cloud service; production scale should use a managed/private PeerServer or a Cloudflare Durable Object signaling service.
- The first pose-model load downloads MediaPipe WASM and the lite model from public CDNs.
- One tracked player per room; no classroom/multi-player support yet.
- Accuracy depends on lighting, camera placement, and keeping the whole body visible.
- Safari/TV browsers with limited WebRTC support may need a laptop/Chromecast/AirPlay fallback.
- Automated checks cover rendering and game/privacy invariants; camera permission and two-device latency still require physical-device QA.

## Privacy and child safety

- Video remains on the phone and is not uploaded or recorded.
- No profiles, names, faces, or persistent identifiers are collected by the app.
- An adult should place the phone safely and clear the movement area before play.

## Next production steps

1. Self-host signaling and pin MediaPipe artifacts to first-party storage.
2. Add multi-player pose assignment and classroom controls.
3. Add device/browser telemetry without personal data.
4. Run COPPA/privacy review and a physical-device matrix before public child-directed launch.
