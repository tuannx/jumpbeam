"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { DataConnection, MediaConnection } from "peerjs";

type Point = { x: number; y: number; visibility?: number };
type PosePacket = { type: "pose"; points: Point[]; sentAt: number };
type Bubble = { id: number; x: number; y: number; radius: number; hue: number; bornAt: number };
type Mode = "home" | "tv" | "phone";

const TRACKED_LANDMARKS = [0, 15, 16, 27, 28, 11, 12, 23, 24]; // nose, wrists, ankles, shoulders, hips
const ROUND_MS = 60_000;
const PEER_PREFIX = "jumpbeam-tv-";

function roomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function queryMode(): { mode: Mode; room: string } {
  if (typeof window === "undefined") return { mode: "home", room: "" };
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  return {
    mode: mode === "tv" || mode === "phone" ? mode : "home",
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

  if (mode === "tv") return <TvGame room={room} onExit={() => navigate("home", "")} />;
  if (mode === "phone") return <PhoneController room={room} onRoom={setRoom} onExit={() => navigate("home", "")} />;

  return (
    <main className="home-shell">
      <nav className="brand" aria-label="JumpBeam"><span className="brand-orb">J</span> JumpBeam <small>PLAY. MOVE. GLOW.</small></nav>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">A 60-second brain break</p>
          <h1>Turn your TV into a <em>movement game.</em></h1>
          <p className="lede">One phone. One TV. No controllers. The phone mirrors its camera to the big screen while on-device pose detection turns body movement into AR game controls.</p>
          <div className="actions">
            <button className="primary" onClick={() => navigate("tv", roomCode())}>Open on TV <span>→</span></button>
            <button className="secondary" onClick={() => navigate("phone", "")}>Use this phone</button>
          </div>
          <p className="privacy"><span>✓</span> Encrypted peer-to-peer camera sharing</p>
        </div>
        <div className="hero-visual" aria-label="Illustration of a child popping bubbles">
          <div className="sun" /><div className="bubble b1">+1</div><div className="bubble b2" /><div className="bubble b3" />
          <div className="kid"><i className="head"/><i className="body"/><i className="arm left"/><i className="arm right"/><i className="leg left"/><i className="leg right"/></div>
          <div className="floor-shadow" />
        </div>
      </section>
      <section className="how">
        <p className="eyebrow">Ready in under a minute</p><h2>Big-screen play, zero setup.</h2>
        <div className="steps">
          <article><b>1</b><span className="step-icon">▣</span><h3>Open on your TV</h3><p>Visit this site in any modern TV browser or a laptop connected by HDMI.</p></article>
          <article><b>2</b><span className="step-icon">⌗</span><h3>Scan & pair</h3><p>Scan the QR code with your phone. The devices connect directly.</p></article>
          <article><b>3</b><span className="step-icon">✦</span><h3>Move & play</h3><p>Prop up the phone, step back, and pop bubbles with your whole body.</p></article>
        </div>
      </section>
    </main>
  );
}

function TvGame({ room: requestedRoom, onExit }: { room: string; onExit: () => void }) {
  const [room] = useState(requestedRoom || roomCode());
  const [status, setStatus] = useState("Waiting for phone");
  const [points, setPoints] = useState<Point[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const nextBubble = useRef(1);
  const popped = useRef(new Set<number>());
  const joinUrl = typeof window === "undefined" ? "" : `${window.location.origin}${window.location.pathname}?mode=phone&room=${room}`;

  useEffect(() => {
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
  }, [room]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video || !remoteStream) return;
    video.srcObject = remoteStream;
    void video.play();
  }, [remoteStream, startedAt]);

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
    setBubbles((current) => {
      let gained = 0;
      const remaining = current.filter((bubble) => {
        if (Date.now() - bubble.bornAt > 6000) return false;
        const hit = points.some((point) => point.visibility !== 0 && Math.hypot(point.x * 100 - bubble.x, point.y * 100 - bubble.y) < bubble.radius + 3.5);
        if (hit && !popped.current.has(bubble.id)) { popped.current.add(bubble.id); gained += 1; return false; }
        return true;
      });
      if (gained) setScore((value) => value + gained);
      return remaining;
    });
  }, [points, startedAt]);

  const remaining = startedAt ? Math.max(0, Math.ceil((ROUND_MS - (now - startedAt)) / 1000)) : 60;
  const finished = startedAt !== null && remaining === 0;

  return (
    <main className="tv-shell">
      <header className="game-hud"><button className="ghost" onClick={onExit}>← Exit</button><div className="hud-pill">SCORE <strong>{score}</strong></div><div className="hud-pill">TIME <strong>{remaining}</strong></div></header>
      {!startedAt && <section className="pair-card"><p className="eyebrow">Pair your phone</p><h1>Room <span>{room}</span></h1><div className="qr-wrap">{joinUrl && <QRCodeSVG value={joinUrl} size={190} level="M" />}</div><p>Scan with your phone camera</p><code>{joinUrl}</code><div className="connection-dot"><i /> {status}</div></section>}
      {startedAt && !finished && <section className="playfield" aria-label="Pop the bubbles game">
        <video ref={remoteVideoRef} className="tv-camera" muted playsInline />
        <div className="ar-tint" />
        <div className="play-message">Move your hands & feet to pop!</div>
        {bubbles.map((bubble) => <span key={bubble.id} className="game-bubble" style={{ left: `${bubble.x}%`, top: `${bubble.y}%`, width: `${bubble.radius * 2}vw`, height: `${bubble.radius * 2}vw`, background: `hsl(${bubble.hue} 82% 62% / .85)` }} />)}
        {points.map((point, index) => <span key={index} className="tracker" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} />)}
        {points.length >= 9 && <div className="ar-hero" style={{ left: `${((points[7].x + points[8].x) / 2) * 100}%`, top: `${(((points[5].y + points[6].y) / 2) * .45 + ((points[7].y + points[8].y) / 2) * .55) * 100}%` }}><i className="hero-ring"/><i className="hero-core">J</i><i className="hero-cape"/></div>}
      </section>}
      {finished && <section className="result-card"><p className="eyebrow">Brain break complete</p><h1>{score} bubbles!</h1><p>Great moving. Take a breath and bring that energy back.</p><button className="primary" onClick={() => window.location.reload()}>Play again</button></section>}
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
      const fileset = await vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm");
      const landmarker = await vision.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task", delegate: "GPU" },
        runningMode: "VIDEO", numPoses: 1, minPoseDetectionConfidence: 0.45, minTrackingConfidence: 0.45,
      });
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
        <p className="eyebrow">Phone controller</p><h1>{tracking ? "You're in the game!" : "Connect to your TV"}</h1>
        <div className={`camera-frame ${tracking ? "active" : ""}`}><video ref={videoRef} muted playsInline /><div className="camera-guide">{tracking ? "Keep your whole body in frame" : "Camera preview appears here"}</div></div>
        {!tracking && <label>ROOM CODE<input value={input} onChange={(event) => setInput(event.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} autoCapitalize="characters" /></label>}
        <p className="phone-status"><i className={tracking ? "online" : ""}/>{status}</p>
        {!tracking ? <button className="primary full" disabled={loading} onClick={connect}>{loading ? "Connecting…" : "Connect & start camera"}</button> : <button className="secondary full" onClick={stop}>Stop camera</button>}
        <p className="privacy-note">Camera video is encrypted and streamed directly to the paired TV for the AR mirror. Pose detection stays on this phone; nine anonymous control points are sent separately for low-latency gameplay.</p>
      </section>
    </main>
  );
}
