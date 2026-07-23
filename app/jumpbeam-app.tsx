"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { DataConnection, MediaConnection } from "peerjs";
import { JuiceCanvas, NeonSkeleton, type BurstEvent, type TrackedPoint } from "./juice-effects";

type Point = TrackedPoint;
type PosePacket = { type: "pose"; points: Point[]; sentAt: number };
type Bubble = { id: number; x: number; y: number; radius: number; hue: number; bornAt: number };
type Mode = "home" | "laptop" | "tv" | "phone";
type CameraMode = "local" | "paired";

const TRACKED_LANDMARKS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]; // nose, shoulders, elbows, wrists, hips, knees, ankles
const ROUND_MS = 60_000;
const SOLO_GOAL = 30;
const PEER_PREFIX = "jumpbeam-tv-";
const MEDIAPIPE_WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MEDIAPIPE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const BUBBLE_GLYPHS = ["◆", "⚡", "★", "◉"] as const;

const CHALLENGE_PHASES = [
  { label: "PRISM POP", instruction: "Reach wide & collect the glowing prisms", icon: "◆" },
  { label: "BEAT SMASH", instruction: "Hit the drum orbs with both hands", icon: "◉" },
  { label: "MAGNET MOVE", instruction: "Pull the energy sparks toward your body", icon: "⚡" },
  { label: "LAVA LEAP", instruction: "Keep moving — the floor is heating up!", icon: "▲" },
] as const;

function roomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function createPoseLandmarker(vision: typeof import("@mediapipe/tasks-vision")) {
  const fileset = await vision.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_ROOT);
  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: MEDIAPIPE_MODEL_URL, delegate },
    runningMode: "VIDEO" as const,
    numPoses: 1,
    minPoseDetectionConfidence: 0.45,
    minTrackingConfidence: 0.45,
  });
  try {
    return await vision.PoseLandmarker.createFromOptions(fileset, options("GPU"));
  } catch (gpuError) {
    console.warn("MediaPipe GPU delegate unavailable; falling back to CPU.", gpuError);
    return vision.PoseLandmarker.createFromOptions(fileset, options("CPU"));
  }
}

function queryMode(): { mode: Mode; room: string } {
  if (typeof window === "undefined") return { mode: "home", room: "" };
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  return {
    mode: mode === "laptop" || mode === "tv" || mode === "phone" ? mode : "home",
    room: (params.get("room") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6),
  };
}

export default function JumpBeamApp() {
  const [initial] = useState(() => queryMode());
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [room, setRoom] = useState(initial.room);

  const navigate = (next: Mode, nextRoom = room) => {
    const params = next === "home" ? "" : `?mode=${next}${nextRoom ? `&room=${nextRoom}` : ""}`;
    window.history.pushState({}, "", `${window.location.pathname}${params}`);
    setMode(next);
    setRoom(nextRoom);
  };

  if (mode === "laptop") return <TvGame room="" cameraMode="local" onExit={() => navigate("home", "")} />;
  if (mode === "tv") return <TvGame room={room} cameraMode="paired" onExit={() => navigate("home", "")} />;
  if (mode === "phone") return <PhoneController room={room} onRoom={setRoom} onExit={() => navigate("home", "")} />;

  return (
    <main className="home-shell">
      <nav className="brand" aria-label="JumpBeam"><span className="brand-orb">J</span> JumpBeam <small>PLAY. MOVE. GLOW.</small></nav>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Solo AR adventure · 60 seconds</p>
          <h1>Your move. <em>Your quest.</em></h1>
          <p className="lede">A personal brain break where one child becomes the hero: follow clear movement cues, build an energy streak and beat your own Prism Quest score.</p>
          <div className="actions">
            <button className="primary" onClick={() => navigate("laptop", "")}>Play on this laptop <span>→</span></button>
            <button className="secondary" onClick={() => navigate("tv", roomCode())}>Play on TV</button>
          </div>
          <p className="privacy"><span>✓</span> Pose detection runs privately in your browser</p>
        </div>
        <div className="hero-visual" aria-label="Illustration of a child popping bubbles">
          <div className="sun" /><div className="bubble b1">+1</div><div className="bubble b2" /><div className="bubble b3" />
          <div className="kid"><i className="head"/><i className="body"/><i className="arm left"/><i className="arm right"/><i className="leg left"/><i className="leg right"/></div>
          <div className="floor-shadow" />
        </div>
      </section>
      <section className="world-system" aria-labelledby="world-system-title">
        <p className="eyebrow">Original visual system</p>
        <h2 id="world-system-title">One hero. Four personal challenges.</h2>
        <div className="world-cards">
          <article className="world-card volcano"><span>▲</span><small>REACTION</small><h3>Lava Leap</h3><p>Coral danger zones, violet safe stones and big directional cues.</p></article>
          <article className="world-card rhythm"><span>◉</span><small>RHYTHM</small><h3>Beat Smash</h3><p>Toy-like drum orbs pulse in repeatable patterns for whole-body hits.</p></article>
          <article className="world-card magnet"><span>⚡</span><small>STEM</small><h3>Magnet Move</h3><p>Cyan attraction arcs make push, pull and polarity visible.</p></article>
          <article className="world-card mystery"><span>◆</span><small>DISCOVERY</small><h3>Prism Pop</h3><p>Mystery crates and collectible prisms create curiosity without clutter.</p></article>
        </div>
      </section>
      <section className="how">
        <p className="eyebrow">Ready in under a minute</p><h2>Play here or go big-screen.</h2>
        <div className="steps">
          <article><b>1</b><span className="step-icon">▣</span><h3>Choose your screen</h3><p>Play instantly with this laptop webcam, or open JumpBeam on a TV.</p></article>
          <article><b>2</b><span className="step-icon">⌗</span><h3>Allow the camera</h3><p>Laptop play needs no pairing. TV play connects privately to your phone.</p></article>
          <article><b>3</b><span className="step-icon">✦</span><h3>Own the quest</h3><p>Step back alone, move your whole body and chase a new personal score.</p></article>
        </div>
      </section>
    </main>
  );
}

function TvGame({ room: requestedRoom, cameraMode, onExit }: { room: string; cameraMode: CameraMode; onExit: () => void }) {
  const [room] = useState(requestedRoom || roomCode());
  const [status, setStatus] = useState(cameraMode === "local" ? "Allow camera access to begin" : "Waiting for phone");
  const [points, setPoints] = useState<Point[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [burst, setBurst] = useState<BurstEvent | null>(null);
  const [impactId, setImpactId] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const nextBubble = useRef(1);
  const nextBurst = useRef(1);
  const comboRef = useRef(0);
  const playfieldRef = useRef<HTMLElement>(null);
  const localAnimationRef = useRef(0);
  const popped = useRef(new Set<number>());
  const joinUrl = typeof window === "undefined" ? "" : `${window.location.origin}${window.location.pathname}?mode=phone&room=${room}`;

  useEffect(() => {
    if (cameraMode !== "paired") return;
    let peer: import("peerjs").default | undefined;
    let active = true;
    import("peerjs").then(({ default: Peer }) => {
      if (!active) return;
      peer = new Peer(`${PEER_PREFIX}${room.toLowerCase()}`);
      peer.on("open", () => setStatus("Waiting for phone"));
      peer.on("connection", (connection) => {
        setStatus("Phone connected — move into view");
        connection.on("data", (data) => {
          const packet = data as PosePacket;
          if (packet?.type === "pose") {
            setPoints(packet.points);
            setStartedAt((value) => value ?? Date.now());
          }
        });
        connection.on("close", () => setStatus("Phone disconnected"));
      });
      peer.on("call", (call) => {
        call.answer();
        call.on("stream", (stream) => {
          setRemoteStream(stream);
          setStatus("Camera live — move into view");
        });
      });
      peer.on("error", (error) => setStatus(error.type === "unavailable-id" ? "Room already open — refresh" : "Connection unavailable"));
    });
    return () => { active = false; peer?.destroy(); };
  }, [cameraMode, room]);

  useEffect(() => {
    if (cameraMode !== "local") return;
    let active = true;
    let localStream: MediaStream | undefined;
    let closeLandmarker: (() => void) | undefined;

    const startLocalCamera = async () => {
      try {
        setStatus("Starting laptop camera…");
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!active) {
          localStream.getTracks().forEach((track) => track.stop());
          return;
        }
        setRemoteStream(localStream);
        setStatus("Camera live — loading pose tracking…");
        const vision = await import("@mediapipe/tasks-vision");
        const landmarker = await createPoseLandmarker(vision);
        closeLandmarker = () => landmarker.close();
        setStatus("Step back until your whole body is visible");
        let lastDetected = 0;
        const detect = () => {
          if (!active) return;
          const video = remoteVideoRef.current;
          const timestamp = performance.now();
          if (video && video.readyState >= 2 && timestamp - lastDetected > 50) {
            const pose = landmarker.detectForVideo(video, timestamp).landmarks[0];
            if (pose) {
              setPoints(TRACKED_LANDMARKS.map((index) => ({ x: 1 - pose[index].x, y: pose[index].y, visibility: pose[index].visibility })));
              setStartedAt((value) => value ?? Date.now());
              setStatus("Camera live");
            }
            lastDetected = timestamp;
          }
          localAnimationRef.current = requestAnimationFrame(detect);
        };
        detect();
      } catch (error) {
        console.error("JumpBeam laptop setup failed.", error);
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          setStatus("Camera permission is required — allow it and reload");
        } else if (localStream) {
          setStatus("Camera is live, but pose tracking could not load — reload to retry");
        } else {
          setStatus("Laptop camera could not start");
        }
      }
    };
    void startLocalCamera();
    return () => {
      active = false;
      cancelAnimationFrame(localAnimationRef.current);
      closeLandmarker?.();
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraMode]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video || !remoteStream) return;
    video.srcObject = remoteStream;
    void video.play();
  }, [remoteStream, startedAt, cameraMode]);

  useEffect(() => {
    if (!startedAt || now - startedAt >= ROUND_MS) return;
    const spawn = window.setInterval(() => {
      setBubbles((current) => current.length >= 9 ? current : [...current, {
        id: nextBubble.current++, x: 10 + Math.random() * 80, y: 18 + Math.random() * 66,
        radius: 4.2 + Math.random() * 1.8, hue: 175 + Math.random() * 150, bornAt: Date.now(),
      }]);
    }, 700);
    return () => clearInterval(spawn);
  }, [startedAt, now]);

  useEffect(() => {
    if (!startedAt) return;
    let gained = 0;
    let firstHit: Bubble | undefined;
    const time = Date.now();
    const remainingBubbles = bubbles.filter((bubble) => {
      if (time - bubble.bornAt > 6000) return false;
      const hit = points.some((point) => (point.visibility ?? 1) > 0.35 && Math.hypot(point.x * 100 - bubble.x, point.y * 100 - bubble.y) < bubble.radius + 3.5);
      if (hit && !popped.current.has(bubble.id)) {
        popped.current.add(bubble.id);
        firstHit ??= bubble;
        gained += 1;
        return false;
      }
      return true;
    });
    if (remainingBubbles.length !== bubbles.length) setBubbles(remainingBubbles);
    if (!gained || !firstHit) return;

    comboRef.current += gained;
    setScore((value) => value + gained);
    setCombo(comboRef.current);
    setImpactId((value) => value + 1);
    setBurst({ id: nextBurst.current++, x: firstHit.x / 100, y: firstHit.y / 100, hue: firstHit.hue, power: gained });

    const shouldShake = gained > 1 || comboRef.current % 5 === 0;
    if (shouldShake && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const strength = gained > 1 ? 6 : 4;
      playfieldRef.current?.animate([
        { transform: "translate(0, 0)" },
        { transform: `translate(${strength}px, ${-strength * 0.5}px)` },
        { transform: `translate(${-strength}px, ${strength * 0.35}px)` },
        { transform: "translate(0, 0)" },
      ], { duration: gained > 1 ? 150 : 105, easing: "ease-out" });
    }
  }, [points, bubbles, startedAt]);

  const remaining = startedAt ? Math.max(0, Math.ceil((ROUND_MS - (now - startedAt)) / 1000)) : 60;
  const finished = startedAt !== null && remaining === 0;
  const phaseIndex = Math.min(3, Math.floor((60 - remaining) / 15));
  const phase = CHALLENGE_PHASES[phaseIndex];

  return (
    <main className="tv-shell">
      <header className="game-hud"><button className="ghost" onClick={onExit}>← Exit</button><div className="solo-chip">● SOLO QUEST · {cameraMode === "local" ? "LAPTOP" : "TV"}</div><div className="hud-pill">PRISMS <strong>{score}<small>/{SOLO_GOAL}</small></strong></div><div className="hud-pill">TIME <strong>{remaining}</strong></div></header>
      {!startedAt && cameraMode === "paired" && <section className="pair-card"><p className="eyebrow">Solo player setup</p><h1>Room <span>{room}</span></h1><div className="qr-wrap">{joinUrl && <QRCodeSVG value={joinUrl} size={190} level="M" />}</div><p>Scan with your phone, then prop it up to frame one player</p><code>{joinUrl}</code><div className="connection-dot"><i /> {status}</div></section>}
      {(startedAt || cameraMode === "local") && !finished && <section ref={playfieldRef} className="playfield" aria-label="Pop the bubbles game">
        <video ref={remoteVideoRef} className="tv-camera" muted playsInline />
        <div className="ar-tint" />
        <div className="energy-lightmap" aria-hidden="true" />
        <div className="quest-frame" aria-hidden="true" />
        <div className="quest-brand"><b>JUMPBEAM</b><span>PRISM QUEST</span></div>
        <div className="solo-progress" aria-label={`${score} of ${SOLO_GOAL} solo goal`}>
          <i style={{ width: `${Math.min(100, score / SOLO_GOAL * 100)}%` }} />
        </div>
        <div key={phaseIndex} className={`phase-cue phase-${phaseIndex}`}><i>{phase.icon}</i><span><b>{phase.label}</b><small>{phase.instruction}</small></span></div>
        {bubbles.map((bubble) => <span key={bubble.id} className={`game-bubble orb-${bubble.id % 4}`} style={{ left: `${bubble.x}%`, top: `${bubble.y}%`, width: `${bubble.radius * 2}vw`, height: `${bubble.radius * 2}vw`, background: `hsl(${bubble.hue} 82% 62% / .85)` }}><b>{BUBBLE_GLYPHS[bubble.id % BUBBLE_GLYPHS.length]}</b></span>)}
        <NeonSkeleton points={points} />
        {points.map((point, index) => <span key={index} className="tracker" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} />)}
        {points.length >= 13 && <div key={impactId} className="ar-hero impact" style={{ left: `${((points[7].x + points[8].x) / 2) * 100}%`, top: `${(((points[1].y + points[2].y) / 2) * .45 + ((points[7].y + points[8].y) / 2) * .55) * 100}%` }}><i className="hero-ring"/><i className="hero-core">J</i><i className="hero-cape"/></div>}
        {combo > 1 && <div key={`${combo}-${impactId}`} className="combo-badge"><small>ENERGY STREAK</small><b>×{combo}</b></div>}
        <JuiceCanvas burst={burst} />
        {!startedAt && cameraMode === "local" && <div className="laptop-setup"><i className="camera-pulse">◉</i><p className="eyebrow">Laptop solo mode</p><h1>Step back into frame</h1><p>{status}</p><small>The 60-second quest starts when your body is detected.</small></div>}
      </section>}
      {finished && <section className="result-card"><p className="eyebrow">Solo quest complete</p><h1>{score} prisms!</h1><p>{score >= SOLO_GOAL ? "Goal crushed! You powered the whole Prism Core." : `Great moving — only ${SOLO_GOAL - score} more to power the Prism Core next time.`}</p><button className="primary" onClick={() => window.location.reload()}>Beat my score</button></section>}
    </main>
  );
}

function PhoneController({ room, onRoom, onExit }: { room: string; onRoom: (room: string) => void; onExit: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<DataConnection | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const peerRef = useRef<import("peerjs").default | null>(null);
  const animationRef = useRef<number>(0);
  const [input, setInput] = useState(room);
  const [status, setStatus] = useState(room ? "Ready to connect" : "Enter the code shown on TV");
  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(false);

  const stop = useCallback(() => {
    cancelAnimationFrame(animationRef.current);
    const stream = videoRef.current?.srcObject;
    if (stream) (stream as MediaStream).getTracks().forEach((track) => track.stop());
    connectionRef.current?.close();
    callRef.current?.close();
    peerRef.current?.destroy();
    setTracking(false);
  }, []);

  useEffect(() => stop, [stop]);

  const connect = async () => {
    const cleanRoom = input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (cleanRoom.length !== 6) { setStatus("Room code must be 6 characters"); return; }
    setLoading(true); setStatus("Loading pose detection…"); onRoom(cleanRoom);
    try {
      const [{ default: Peer }, vision] = await Promise.all([import("peerjs"), import("@mediapipe/tasks-vision")]);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const peer = new Peer();
      peerRef.current = peer;
      await new Promise<void>((resolve, reject) => { peer.on("open", () => resolve()); peer.on("error", reject); window.setTimeout(() => reject(new Error("peer-timeout")), 12_000); });
      const connection = peer.connect(`${PEER_PREFIX}${cleanRoom.toLowerCase()}`, { reliable: false });
      connectionRef.current = connection;
      await new Promise<void>((resolve, reject) => { connection.on("open", () => resolve()); connection.on("error", reject); window.setTimeout(() => reject(new Error("timeout")), 12_000); });
      callRef.current = peer.call(`${PEER_PREFIX}${cleanRoom.toLowerCase()}`, stream);
      const landmarker = await createPoseLandmarker(vision);
      setStatus("Connected — prop up phone and step back"); setTracking(true); setLoading(false);
      let lastSent = 0;
      const detect = () => {
        const video = videoRef.current;
        if (!video || connection.open === false) return;
        const timestamp = performance.now();
        if (video.readyState >= 2 && timestamp - lastSent > 50) {
          const result = landmarker.detectForVideo(video, timestamp);
          const pose = result.landmarks[0];
          if (pose) {
            const points = TRACKED_LANDMARKS.map((index) => ({ x: 1 - pose[index].x, y: pose[index].y, visibility: pose[index].visibility }));
            connection.send({ type: "pose", points, sentAt: Date.now() } satisfies PosePacket);
          }
          lastSent = timestamp;
        }
        animationRef.current = requestAnimationFrame(detect);
      };
      detect();
    } catch (error) {
      setLoading(false); setStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "Camera permission is required" : "Could not connect. Check the TV room and internet.");
      stop();
    }
  };

  return (
    <main className="phone-shell">
      <header><button className="ghost" onClick={() => { stop(); onExit(); }}>← Back</button><div className="brand"><span className="brand-orb">J</span> JumpBeam</div></header>
      <section className="phone-card">
        <p className="eyebrow">Solo camera</p><h1>{tracking ? "You're the hero!" : "Connect your solo quest"}</h1>
        <div className={`camera-frame ${tracking ? "active" : ""}`}><video ref={videoRef} muted playsInline /><div className="camera-guide">{tracking ? "Keep one player's whole body in frame" : "Your solo camera preview appears here"}</div></div>
        {!tracking && <label>ROOM CODE<input value={input} onChange={(event) => setInput(event.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} autoCapitalize="characters" /></label>}
        <p className="phone-status"><i className={tracking ? "online" : ""}/>{status}</p>
        {!tracking ? <button className="primary full" disabled={loading} onClick={connect}>{loading ? "Connecting…" : "Connect & start camera"}</button> : <button className="secondary full" onClick={stop}>Stop camera</button>}
        <p className="privacy-note">Camera video is encrypted and streamed directly to the paired TV for the AR mirror. Pose detection stays on this phone; thirteen anonymous control points are sent separately for low-latency gameplay.</p>
      </section>
    </main>
  );
}
