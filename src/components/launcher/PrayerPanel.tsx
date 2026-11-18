import { MoonStar } from "lucide-react";
import { useMemo } from "react";
import { countdownParts, nextPrayer, prayerTimesFor } from "@/lib/cockpit/prayer";
import { formatHM24, useT } from "@/lib/cockpit/i18n";
import { useLocation } from "@/lib/cockpit/location-store";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";

export function PrayerPanel() {
  const { t, lang } = useT();
  const now = useNow(1000);
  const lat = useLocation((s) => s.lat);
  const lng = useLocation((s) => s.lng);
  const isDefault = useLocation((s) => s.isDefault);
  const next = nextPrayer(lat, lng, now);
  const cd = countdownParts(next.time, now);
  // After Isha the list switches to tomorrow, so it always matches the highlighted next prayer.
  const listDay = next.time.toDateString();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => prayerTimesFor(lat, lng, next.time), [lat, lng, listDay]);

  return (
    <div className="glass flex h-full flex-col rounded-2xl px-4 py-3 animate-screen-in">
      <div className="flex items-center gap-2">
        <MoonStar className="size-5 text-primary" />
        <h2 className="text-lg font-extrabold">{t("prayerTimes")}</h2>
      </div>
      <div className="mt-0.5 text-xs font-medium text-muted-foreground">
        {isDefault ? t("defaultLocation") : t("yourLocation")}
      </div>

      <div className="mt-2 flex flex-col items-center rounded-xl py-2 text-center">
        <span className="text-sm font-bold text-muted-foreground">{t("nextPrayer")}</span>
        <span className="text-[34px] font-extrabold leading-tight text-primary glow-text">{t(next.key)}</span>
        <span className="font-display text-[30px] font-bold leading-none tnum" dir="ltr">
          {formatHM24(next.time)}
        </span>
        <span className="mt-1.5 text-sm font-bold text-foreground/90">
          {t("remaining")}{" "}
          <span dir="ltr" className="font-display text-base tnum">
            {String(cd.h).padStart(2, "0")}:{String(cd.m).padStart(2, "0")}:{String(cd.s).padStart(2, "0")}
          </span>
        </span>
      </div>

      <ul className="mt-2 flex flex-1 flex-col justify-end gap-1">
        {list.map((p) => {
          const active = p.key === next.key;
          return (
            <li
              key={p.key}
              className={cn(
                "flex h-8 items-center justify-between rounded-lg px-3 text-[15px] font-bold transition-colors",
                active ? "active-band glow-ring text-primary animate-soft-pulse" : "text-foreground/90",
              )}
            >
              <span>{t(p.key)}</span>
              <span dir="ltr" className="font-display text-[17px] tnum">
                {formatHM24(p.time)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 truncate text-center text-[10px] text-muted-foreground" lang={lang}>
        {t("method")}
      </div>
    </div>
  );
}
