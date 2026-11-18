import { useEffect, useState, type ReactNode } from "react";
import { STAGE_H } from "./RoadScene";

const MIN_W = 1100; // ~16:10 head units
const MAX_W = 1560; // ultra-wide units

/** Fixed-height cockpit canvas (720 units) that adapts its width to the screen ratio and scales to fit. */
export function Stage({ children }: { children: (width: number) => ReactNode }) {
  const [dims, setDims] = useState({ w: 1280, scale: 1 });
  useEffect(() => {
    const fit = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.round(Math.min(MAX_W, Math.max(MIN_W, (STAGE_H * vw) / vh)));
      setDims({ w, scale: Math.min(vw / w, vh / STAGE_H) });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden bg-background"
        style={{
          width: dims.w,
          height: STAGE_H,
          transform: `translate(-50%, -50%) scale(${dims.scale})`,
        }}
      >
        {children(dims.w)}
      </div>
    </div>
  );
}
