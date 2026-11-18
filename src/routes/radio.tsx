import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Radio } from "lucide-react";
import { useState } from "react";
import { ScreenShell } from "@/components/launcher/ScreenShell";
import { Slider } from "@/components/ui/slider";
import { useT } from "@/lib/cockpit/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/radio")({
  head: () => ({
    meta: [
      { title: "الراديو — جاردينيا سمارت كار" },
      { name: "description", content: "محطات FM في واجهة السيارة." },
      { property: "og:title", content: "الراديو — جاردينيا سمارت كار" },
      { property: "og:description", content: "موالف FM ومحطات مفضلة." },
    ],
  }),
  component: RadioScreen,
});

const STATIONS = [
  { name: "راديو مصر", f: 88.7 },
  { name: "ميجا إف إم", f: 92.7 },
  { name: "إذاعة القرآن الكريم", f: 98.2 },
  { name: "نجوم إف إم", f: 100.6 },
  { name: "نايل إف إم", f: 104.2 },
  { name: "نغم إف إم", f: 105.3 },
];

function RadioScreen() {
  const { t } = useT();
  const [freq, setFreq] = useState(100.6);
  const current = STATIONS.find((s) => Math.abs(s.f - freq) < 0.05);
  const stepBy = (d: number) => setFreq((f) => Math.min(108, Math.max(87.5, Math.round((f + d) * 10) / 10)));
  return (
    <ScreenShell title={t("radio")} icon={Radio} note={t("radioNote")}>
      <div className="grid h-full grid-cols-[1.2fr_1fr] gap-6">
        <div className="flex flex-col items-center justify-center gap-5">
          <div className="text-sm font-bold text-muted-foreground">FM</div>
          <div className="font-display text-[96px] font-bold leading-none text-primary glow-text tnum" dir="ltr">
            {freq.toFixed(1)}
          </div>
          <div className="h-6 text-lg font-bold">{current?.name ?? ""}</div>
          <div className="flex w-full max-w-lg items-center gap-4" dir="ltr">
            <button className="icon-btn press" onClick={() => stepBy(-0.1)} aria-label="-0.1">
              <ChevronLeft />
            </button>
            <Slider dir="ltr" value={[freq]} min={87.5} max={108} step={0.1} onValueChange={([v]) => setFreq(Math.round((v ?? 100) * 10) / 10)} />
            <button className="icon-btn press" onClick={() => stepBy(0.1)} aria-label="+0.1">
              <ChevronRight />
            </button>
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-bold text-muted-foreground">{t("stations")}</h2>
          <div className="grid grid-cols-2 gap-2">
            {STATIONS.map((s) => (
              <button
                key={s.f}
                onClick={() => setFreq(s.f)}
                className={cn(
                  "press glass flex flex-col items-start rounded-xl px-4 py-3 text-start",
                  current?.f === s.f && "glow-ring text-primary",
                )}
              >
                <span className="font-display text-2xl font-bold tnum" dir="ltr">
                  {s.f.toFixed(1)}
                </span>
                <span className="text-sm font-bold">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
