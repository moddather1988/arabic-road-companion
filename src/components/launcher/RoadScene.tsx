import { useEffect, useRef } from "react";
import skyUrl from "@/assets/scene-sky.jpg";
import palmUrl from "@/assets/palm.png";
import { useDrive } from "@/lib/cockpit/drive";
import type { SceneId } from "@/lib/cockpit/settings-store";

export const STAGE_H = 720;
export const HORIZON = Math.round(STAGE_H * 0.46);
const SKY_HORIZON_FRAC = 0.575; // where the horizon sits in scene-sky.jpg
const ROAD_HALF_M = 5;
const Z_NEAR = 2;
const D = (STAGE_H - HORIZON) * Z_NEAR; // y = HORIZON + D / z

interface Props {
  width: number;
  mode: "night" | "day";
  scene: SceneId;
}

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Pseudo-3D road rendered on canvas: perspective lanes, palms passing by, moving asphalt,
 * headlight pool at night. Speed comes from the drive store (demo or GPS) and is smoothed
 * per frame so motion stays fluid.
 */
export function RoadScene({ width, mode, scene }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const opts = useRef({ width, mode, scene });
  opts.current = { width, mode, scene };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sky = new Image();
    sky.src = skyUrl;
    const palm = new Image();
    palm.src = palmUrl;

    let raf = 0;
    let last = performance.now();
    let pos = 0; // metres travelled (visual)
    let shown = useDrive.getState().speed;
    let q = 1;

    const resize = () => {
      q = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(opts.current.width * q);
      canvas.height = Math.round(STAGE_H * q);
    };
    resize();
    let lastW = opts.current.width;

    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const { width: W, mode: m, scene: sc } = opts.current;
      if (W !== lastW) {
        lastW = W;
        resize();
      }
      const target = useDrive.getState().speed;
      shown += (target - shown) * Math.min(1, dt * 3);
      pos += (shown / 3.6) * dt * 0.9;

      const H = STAGE_H;
      const CX = W / 2;
      const K = (W * 0.44) / (H - HORIZON);
      const halfAt = (y: number) => (y - HORIZON) * K;
      const yAt = (z: number) => HORIZON + D / z;
      const night = m === "night";

      ctx.setTransform(q, 0, 0, q, 0, 0);

      // Sky + far terrain
      if (sc === "minimal") {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, night ? "#03080d" : "#cfe6ee");
        g.addColorStop(0.46, night ? "#0b2130" : "#9cc9d6");
        g.addColorStop(0.47, night ? "#061019" : "#7aa3b0");
        g.addColorStop(1, night ? "#02060a" : "#5d7f8b");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      } else if (sky.complete && sky.naturalWidth) {
        const s = Math.max(W / sky.naturalWidth, (H - HORIZON) / (sky.naturalHeight * (1 - SKY_HORIZON_FRAC)));
        const iw = sky.naturalWidth * s;
        const ih = sky.naturalHeight * s;
        ctx.drawImage(sky, (W - iw) / 2, HORIZON - ih * SKY_HORIZON_FRAC, iw, ih);
        if (!night) {
          ctx.globalCompositeOperation = "screen";
          const g = ctx.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, "rgba(120,190,215,0.85)");
          g.addColorStop(0.46, "rgba(200,225,220,0.7)");
          g.addColorStop(1, "rgba(150,140,120,0.55)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, H);
          ctx.globalCompositeOperation = "source-over";
        }
      } else {
        ctx.fillStyle = night ? "#071520" : "#a9cdd8";
        ctx.fillRect(0, 0, W, H);
      }

      // Roadside sand shoulders
      if (sc !== "minimal") {
        ctx.beginPath();
        ctx.moveTo(CX - 2, HORIZON);
        ctx.lineTo(CX + 2, HORIZON);
        ctx.lineTo(CX + halfAt(H) * 1.35, H);
        ctx.lineTo(CX - halfAt(H) * 1.35, H);
        ctx.closePath();
        ctx.fillStyle = night ? "rgba(70,72,70,0.55)" : "rgba(196,178,140,0.55)";
        ctx.fill();
      }

      // Asphalt
      ctx.beginPath();
      ctx.moveTo(CX - 1, HORIZON);
      ctx.lineTo(CX + 1, HORIZON);
      ctx.lineTo(CX + halfAt(H), H);
      ctx.lineTo(CX - halfAt(H), H);
      ctx.closePath();
      const ag = ctx.createLinearGradient(0, HORIZON, 0, H);
      if (sc === "minimal") {
        ag.addColorStop(0, night ? "#08141c" : "#516b75");
        ag.addColorStop(1, night ? "#050c12" : "#3a4f57");
      } else {
        ag.addColorStop(0, night ? "#3a4248" : "#6d767c");
        ag.addColorStop(1, night ? "#1b2025" : "#3d454b");
      }
      ctx.fillStyle = ag;
      ctx.fill();

      // Moving transverse texture bands
      ctx.save();
      ctx.clip();
      for (let n = Math.ceil((pos + Z_NEAR * 0.8) / 4); n * 4 - pos < 120; n++) {
        const z = n * 4 - pos;
        const y = yAt(z);
        const y2 = yAt(z + 1.2);
        ctx.fillStyle = hash(n) > 0.5 ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.05)";
        ctx.fillRect(0, y2, W, Math.max(0.5, y - y2));
      }
      ctx.restore();

      // Edge lines
      const lineColor = sc === "minimal" ? "rgba(80,230,220,0.9)" : night ? "rgba(235,240,240,0.85)" : "rgba(250,250,250,0.95)";
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(CX + side * 0.5, HORIZON);
        ctx.lineTo(CX + side * halfAt(H) * 0.92, H);
        ctx.lineTo(CX + side * halfAt(H) * 0.88, H);
        ctx.closePath();
        ctx.fillStyle = lineColor;
        ctx.fill();
      }

      // Centre dashes
      ctx.fillStyle = lineColor;
      const dashSp = 12;
      for (let n = Math.ceil((pos + 0.6) / dashSp); n * dashSp - pos < 200; n++) {
        const z1 = n * dashSp - pos;
        const z2 = z1 + 5;
        const y1 = yAt(Math.max(0.6, z1));
        const y2 = yAt(z2);
        if (y2 > H) continue;
        const w1 = halfAt(y1) * 0.022;
        const w2 = halfAt(y2) * 0.022;
        ctx.beginPath();
        ctx.moveTo(CX - w2, y2);
        ctx.lineTo(CX + w2, y2);
        ctx.lineTo(CX + w1, y1);
        ctx.lineTo(CX - w1, y1);
        ctx.closePath();
        ctx.fill();
      }

      // Minimal scene: neon grid
      if (sc === "minimal") {
        ctx.strokeStyle = night ? "rgba(60,210,210,0.22)" : "rgba(30,110,120,0.25)";
        ctx.lineWidth = 1;
        for (let n = Math.ceil(pos / 8); n * 8 - pos < 160; n++) {
          const y = yAt(n * 8 - pos);
          if (y > H) continue;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }
        for (let i = -14; i <= 14; i++) {
          ctx.beginPath();
          ctx.moveTo(CX, HORIZON);
          ctx.lineTo(CX + i * halfAt(H) * 0.6, H);
          ctx.stroke();
        }
      }

      // Palms (and sparse ones for desert)
      if (sc !== "minimal" && palm.complete && palm.naturalWidth) {
        const rows =
          sc === "oasis"
            ? [
                { lat: 13, sp: 17, off: 8.5, size: 1.05 },
                { lat: 8, sp: 17, off: 0, size: 1 },
              ]
            : [{ lat: 11, sp: 70, off: 0, size: 0.95 }];
        const aspect = palm.naturalWidth / palm.naturalHeight;
        for (const row of rows) {
          for (const side of [-1, 1]) {
            const shift = row.off + (side > 0 ? row.sp * 0.37 : 0);
            const nMax = Math.floor((pos + 190 - shift) / row.sp);
            const nMin = Math.ceil((pos + 1.4 - shift) / row.sp);
            for (let n = nMax; n >= nMin; n--) {
              const z = n * row.sp + shift - pos;
              const y = yAt(z);
              const pxm = halfAt(y) / ROAD_HALF_M;
              const r = hash(n * 3 + side + row.lat);
              const h = pxm * 9.5 * row.size * (0.85 + r * 0.3);
              const w = h * aspect;
              const x = CX + side * pxm * (row.lat + r * 1.5);
              ctx.globalAlpha = Math.min(1, Math.max(0, (190 - z) / 60));
              if (r > 0.5) {
                ctx.save();
                ctx.translate(x, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(palm, -w / 2, y - h, w, h);
                ctx.restore();
              } else {
                ctx.drawImage(palm, x - w / 2, y - h, w, h);
              }
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      // Night grade + headlights
      if (night) {
        ctx.fillStyle = sc === "minimal" ? "rgba(0,8,14,0.15)" : "rgba(2,12,22,0.42)";
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "screen";
        // light pool just ahead of the car
        ctx.save();
        ctx.translate(CX, H * 0.54);
        ctx.scale(1, 0.3);
        const hg = ctx.createRadialGradient(0, 0, 10, 0, 0, W * 0.24);
        hg.addColorStop(0, "rgba(210,245,250,0.55)");
        hg.addColorStop(0.55, "rgba(140,220,230,0.18)");
        hg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = hg;
        ctx.fillRect(-W, -H * 2, W * 2, H * 4);
        ctx.restore();
        // soft beams reaching down the road (layered for feathered edges)
        const by = H * 0.6;
        for (const [spread, alpha] of [
          [0.75, 0.05],
          [0.55, 0.07],
          [0.35, 0.09],
        ] as const) {
          const bg = ctx.createLinearGradient(0, by, 0, HORIZON + 18);
          bg.addColorStop(0, `rgba(190,240,245,${alpha})`);
          bg.addColorStop(1, "rgba(190,240,245,0)");
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.moveTo(CX - halfAt(by) * spread, by);
          ctx.lineTo(CX + halfAt(by) * spread, by);
          ctx.lineTo(CX + 30 * spread, HORIZON + 18);
          ctx.lineTo(CX - 30 * spread, HORIZON + 18);
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      }

      // Vignette for panel legibility
      const vg = ctx.createRadialGradient(CX, H * 0.55, H * 0.35, CX, H * 0.55, W * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, night ? "rgba(0,6,12,0.55)" : "rgba(10,30,40,0.18)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ width, height: STAGE_H }}
    />
  );
}
