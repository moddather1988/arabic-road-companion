import { Navigation } from "lucide-react";
import { GAUGE_MAX, GAUGE_SWEEP, headingLabel, speedToAngle, useDrive } from "@/lib/cockpit/drive";
import { useT } from "@/lib/cockpit/i18n";
import { useSettings } from "@/lib/cockpit/settings-store";
import { cn } from "@/lib/utils";

const VB_W = 460;
const VB_H = 420;
const CX = 230;
const CY = 232;
const R = 205;

function polar(angleDeg: number, r: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function arcPath(r: number) {
  const s = polar(-GAUGE_SWEEP / 2, r);
  const e = polar(GAUGE_SWEEP / 2, r);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 1 1 ${e.x} ${e.y}`;
}

const ARC_LEN = (R * GAUGE_SWEEP * Math.PI) / 180;
const TICKS = Array.from({ length: GAUGE_MAX / 10 + 1 }, (_, i) => i * 10);

export function Speedometer() {
  const live = useDrive((s) => s.speed);
  const heading = useDrive((s) => s.heading);
  const hasHeading = useDrive((s) => s.hasHeading);
  const gps = useDrive((s) => s.gps);
  const source = useSettings((s) => s.speedSource);
  const scale = useSettings((s) => s.gaugeScale);
  const { t, lang } = useT();
  const speed = live;
  const frac = Math.min(1, Math.max(0, speed / GAUGE_MAX));
  const needle = polar(speedToAngle(speed), R - 6);

  const sourceLabel =
    source === "demo" ? t("demoSpeed") : gps === "active" ? t("gpsSpeed") : t("waitingGps");

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-0 origin-top"
      style={{ width: VB_W, height: VB_H, transform: `translateX(-50%) scale(${scale})` }}
      dir="ltr"
    >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="absolute inset-0 h-full w-full overflow-visible"
      >
        <defs>
          <linearGradient id="arcGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--sky)" />
            <stop offset="1" stopColor="var(--primary)" />
          </linearGradient>
        </defs>
        {/* track */}
        <path
          d={arcPath(R)}
          fill="none"
          stroke="var(--primary)"
          strokeOpacity="0.28"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* progress */}
        <path
          d={arcPath(R)}
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={ARC_LEN}
          strokeDashoffset={ARC_LEN * (1 - frac)}
          style={{
            transition: "stroke-dashoffset 160ms linear",
            filter: "drop-shadow(0 0 6px var(--glow))",
          }}
        />
        {TICKS.map((v) => {
          const a = speedToAngle(v);
          const major = v % 20 === 0;
          const p1 = polar(a, R - 12);
          const p2 = polar(a, R - (major ? 30 : 22));
          const on = v <= speed;
          return (
            <line
              key={v}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={on ? "var(--primary)" : "var(--foreground)"}
              strokeOpacity={on ? 1 : 0.55}
              strokeWidth={major ? 3 : 2}
              strokeLinecap="round"
            />
          );
        })}
        {TICKS.filter((v) => v % 20 === 0).map((v) => {
          const p = polar(speedToAngle(v), R - 50);
          return (
            <text
              key={v}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="Rajdhani, sans-serif"
              fontWeight="700"
              fontSize="19"
              fill="var(--foreground)"
              style={{
                paintOrder: "stroke",
                stroke: "var(--background)",
                strokeWidth: 3,
                strokeOpacity: 0.35,
              }}
            >
              {v}
            </text>
          );
        })}
        {/* needle tip marker */}
        <circle
          cx={needle.x}
          cy={needle.y}
          r="7"
          fill="var(--primary)"
          style={{ filter: "drop-shadow(0 0 8px var(--glow))" }}
        />
      </svg>

      {/* Centre readout */}
      <div className="absolute inset-x-0 top-[92px] flex flex-col items-center">
        <div className="glass flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold text-primary">
          <Navigation
            className={cn(
              "size-3.5 transition-transform duration-500",
              !hasHeading && "opacity-40",
            )}
            style={{ transform: `rotate(${heading}deg)` }}
          />
          <span>
            {hasHeading ? `${headingLabel(heading, lang)} ${Math.round(heading)}°` : "GPS --"}
          </span>
        </div>
        <div className="mt-1 font-display text-[78px] font-bold leading-none text-foreground glow-text tnum">
          {Math.round(speed)}
        </div>
        <div className="text-lg font-bold text-foreground" dir={lang === "ar" ? "rtl" : "ltr"}>
          {t("kmh")}
        </div>
        <div
          className="mt-1 rounded-full bg-background/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
          dir={lang === "ar" ? "rtl" : "ltr"}
        >
          {sourceLabel}
        </div>
      </div>
    </div>
  );
}
