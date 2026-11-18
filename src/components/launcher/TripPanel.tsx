import { MapPin, RotateCcw } from "lucide-react";
import { averageSpeed, fuelEstimate, useDrive } from "@/lib/cockpit/drive";
import { formatTime12, localeFor, useT } from "@/lib/cockpit/i18n";
import { useSettings } from "@/lib/cockpit/settings-store";
import { useNow } from "@/hooks/use-now";

function Row({ label, value, unit, note }: { label: string; value: string; unit: string; note?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-primary/25 py-2 last:border-0">
      <div className="flex flex-col">
        <span className="text-[15px] font-bold text-foreground">{label}</span>
        {note && <span className="text-[10px] text-muted-foreground">{note}</span>}
      </div>
      <span className="flex items-baseline gap-1">
        <span className="font-display text-[26px] font-bold leading-none text-foreground tnum">{value}</span>
        <span className="text-xs font-medium text-muted-foreground">{unit}</span>
      </span>
    </div>
  );
}

export function TripPanel() {
  const { t, lang } = useT();
  const now = useNow(1000);
  const { hm, period } = formatTime12(now, lang);
  const date = new Intl.DateTimeFormat(localeFor(lang), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const distance = useDrive((s) => s.distanceKm);
  const sec = useDrive((s) => s.drivingSec);
  const reset = useDrive((s) => s.resetTrip);
  const source = useSettings((s) => s.speedSource);
  const rate = useSettings((s) => s.fuelRate);
  const price = useSettings((s) => s.fuelPrice);
  const fuel = fuelEstimate(distance, rate, price);
  const mins = Math.floor(sec / 60);
  const duration = mins >= 60 ? `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}` : String(mins);

  return (
    <div className="flex h-full flex-col gap-2.5 animate-screen-in">
      <div className="glass rounded-2xl px-5 py-3 text-center">
        <div className="flex items-baseline justify-center gap-2">
          <span className="font-display text-[60px] font-bold leading-none text-foreground glow-text tnum" dir="ltr">
            {hm}
          </span>
          <span className="text-lg font-bold text-primary">{period}</span>
        </div>
        <div className="mt-1 text-[15px] font-bold text-foreground/90">{date}</div>
      </div>

      <div className="glass flex min-h-0 flex-1 flex-col rounded-2xl px-4 py-3">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            <h2 className="text-lg font-extrabold">{t("tripSummary")}</h2>
          </div>
          <button onClick={reset} className="press rounded-lg p-1.5 text-muted-foreground hover:text-primary" aria-label={t("resetTrip")} title={t("resetTrip")}>
            <RotateCcw className="size-4" />
          </button>
        </div>
        <span className="mb-1 self-start rounded-full border border-alert/40 px-2 py-0.5 text-[10px] font-bold text-alert">
          {source === "demo" ? t("demoData") : t("gpsData")}
        </span>
        <div className="flex flex-1 flex-col justify-between">
          <Row label={t("distance")} value={distance.toFixed(1)} unit={t("km")} />
          <Row label={t("duration")} value={duration} unit={mins >= 60 ? t("hr") : t("min")} />
          <Row label={t("avgSpeed")} value={averageSpeed(distance, sec).toFixed(0)} unit={t("kmh")} />
          <Row label={t("consumption")} value={rate.toFixed(1)} unit={t("lPer100")} note={t("assumed")} />
          <Row label={t("fuelCost")} value={fuel.cost.toFixed(1)} unit={t("currency")} note={t("estimated")} />
        </div>
      </div>
    </div>
  );
}
