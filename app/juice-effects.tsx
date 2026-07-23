"use client";

import { useEffect, useRef } from "react";

export type TrackedPoint = { x: number; y: number; visibility?: number };
export type BurstEvent = { id: number; x: number; y: number; hue: number; power: number };

const MAX_PARTICLES = 144;
const SKELETON_EDGES = [
  [0, 1], [0, 2], [1, 2],
  [1, 3], [3, 5], [2, 4], [4, 6],
  [1, 7], [2, 8], [7, 8],
  [7, 9], [9, 11], [8, 10], [10, 12],
] as const;

type Particle = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  hue: number;
};

class ParticlePool {
  private readonly particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
    active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, radius: 0, hue: 0,
  }));
  private cursor = 0;

  burst(event: BurstEvent, width: number, height: number) {
    const amount = Math.min(28, 14 + Math.round(event.power * 6));
    const scale = Math.min(width, height);
    for (let index = 0; index < amount; index += 1) {
      const particle = this.particles[this.cursor];
      this.cursor = (this.cursor + 1) % MAX_PARTICLES;
      const angle = (index / amount) * Math.PI * 2 + event.id * 0.71;
      const speed = scale * (0.17 + ((index * 37 + event.id * 13) % 100) / 520);
      const maxLife = 0.34 + ((index * 29 + event.id * 7) % 100) / 260;
      particle.active = true;
      particle.x = event.x * width;
      particle.y = event.y * height;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - scale * 0.05;
      particle.life = maxLife;
      particle.maxLife = maxLife;
      particle.radius = scale * (0.006 + (index % 4) * 0.0018);
      particle.hue = event.hue + (index % 3 - 1) * 18;
    }
  }

  draw(context: CanvasRenderingContext2D, delta: number) {
    context.globalCompositeOperation = "lighter";
    for (const particle of this.particles) {
      if (!particle.active) continue;
      particle.life -= delta;
      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }
      particle.vy += 110 * delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      const progress = particle.life / particle.maxLife;
      const radius = particle.radius * (0.35 + progress);
      context.beginPath();
      context.fillStyle = `hsl(${particle.hue} 100% 68% / ${progress * 0.28})`;
      context.arc(particle.x, particle.y, radius * 2.6, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.fillStyle = `hsl(${particle.hue} 100% 88% / ${progress})`;
      context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalCompositeOperation = "source-over";
  }
}

export function JuiceCanvas({ burst }: { burst: BurstEvent | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poolRef = useRef(new ParticlePool());
  const sizeRef = useRef({ width: 1, height: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let previous = performance.now();

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const quality = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(bounds.width * quality));
      canvas.height = Math.max(1, Math.round(bounds.height * quality));
      context.setTransform(quality, 0, 0, quality, 0, 0);
      sizeRef.current = { width: bounds.width, height: bounds.height };
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const render = (time: number) => {
      const delta = Math.min(0.033, (time - previous) / 1000);
      previous = time;
      const { width, height } = sizeRef.current;
      context.clearRect(0, 0, width, height);
      poolRef.current.draw(context, delta);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!burst) return;
    const { width, height } = sizeRef.current;
    poolRef.current.burst(burst, width, height);
  }, [burst]);

  return <canvas ref={canvasRef} className="juice-canvas" aria-hidden="true" data-particle-cap={MAX_PARTICLES} />;
}

export function NeonSkeleton({ points }: { points: readonly TrackedPoint[] }) {
  if (points.length < 13) return null;
  return (
    <svg className="neon-skeleton" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <g className="skeleton-glow">
        {SKELETON_EDGES.map(([from, to]) => {
          const a = points[from];
          const b = points[to];
          if ((a.visibility ?? 1) < 0.35 || (b.visibility ?? 1) < 0.35) return null;
          return <line key={`${from}-${to}`} x1={a.x * 100} y1={a.y * 100} x2={b.x * 100} y2={b.y * 100} />;
        })}
      </g>
      <g className="skeleton-core">
        {SKELETON_EDGES.map(([from, to]) => {
          const a = points[from];
          const b = points[to];
          if ((a.visibility ?? 1) < 0.35 || (b.visibility ?? 1) < 0.35) return null;
          return <line key={`${from}-${to}`} x1={a.x * 100} y1={a.y * 100} x2={b.x * 100} y2={b.y * 100} />;
        })}
      </g>
    </svg>
  );
}
