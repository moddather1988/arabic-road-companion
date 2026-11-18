import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bluetooth,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Home,
  LocateFixed,
  LocateOff,
  Map,
  Moon,
  Settings,
  Sun,
  SunMoon,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandMark } from "./BrandMark";
import { useT } from "@/lib/cockpit/i18n";
import { useSettings } from "@/lib/cockpit/settings-store";
import { useLocation } from "@/lib/cockpit/location-store";
import { useWeather } from "@/hooks/use-weather";
import { cn } from "@/lib/utils";

function weatherIcon(code: number, isDay: boolean) {
  if (code === 0) return isDay ? Sun : Moon;
  if (code <= 3) return CloudSun;
  if (code <= 48) return CloudFog;
  if (code <= 57) return CloudDrizzle;
  if (code <= 67 || (code >= 80 && code <= 82)) return CloudRain;
  if (code <= 77 || code === 85 || code === 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

function WeatherChip() {
  const { data, isError } = useWeather();
  const { t } = useT();
  const Icon = data ? weatherIcon(data.code, data.isDay) : Cloud;
  return (
    <div
      className="glass absolute left-1/2 top-0 flex h-[46px] -translate-x-1/2 items-center gap-3 rounded-2xl px-5 text-primary"
      title={isError ? t("weatherNA") : undefined}
    >
      <Icon className="size-5" />
      <span dir="ltr" className="font-display text-2xl font-bold text-foreground tnum">
        {data ? `${Math.round(data.temp)}°` : "--°"}
      </span>
    </div>
  );
}

export function TopBar() {
  const { t } = useT();
  const theme = useSettings((s) => s.theme);
  const setS = useSettings((s) => s.set);
  const showWeather = useSettings((s) => s.widgets.weather);
  const loc = useLocation();
  const isHome = useRouterState({ select: (s) => s.location.pathname === "/" });
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const up = () => setOnline(navigator.onLine);
    up();
    window.addEventListener("online", up);
    window.addEventListener("offline", up);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", up);
    };
  }, []);

  const ThemeIcon = theme === "auto" ? SunMoon : theme === "night" ? Moon : Sun;
  const gpsOk = loc.status === "ok";

  return (
    <header className="relative flex h-[50px] shrink-0 items-center justify-between">
      <div className="flex items-center gap-2">
        <Link to="/" className="press text-primary glow-text" aria-label={t("home")}>
          <BrandMark className="h-[42px] w-auto" />
        </Link>
        {!isHome && (
          <Link to="/" className="icon-btn press animate-screen-in" aria-label={t("home")}>
            <Home className="size-5" />
          </Link>
        )}
      </div>

      {showWeather && <WeatherChip />}

      <nav className="flex items-center gap-2">
        <Link to="/settings" className="icon-btn press" aria-label={t("settings")}>
          <Settings className="size-5" />
        </Link>
        <button
          className="icon-btn press"
          aria-label={theme === "night" ? t("nightMode") : t("dayMode")}
          onClick={() => {
            const next = theme === "night" ? "day" : "night";
            setS({ theme: next });
            toast(next === "night" ? t("nightMode") : t("dayMode"));
          }}
        >
          <ThemeIcon className="size-5" />
        </button>
        <button
          className={cn("icon-btn press", !online && "text-muted-foreground")}
          aria-label={t("wifi")}
          onClick={() => toast(`${t("wifi")}: ${online ? t("online") : t("offline")}`)}
        >
          {online ? <Wifi className="size-5" /> : <WifiOff className="size-5" />}
        </button>
        <button className="icon-btn press" aria-label={t("bluetooth")} onClick={() => toast(t("btNote"))}>
          <Bluetooth className="size-5" />
        </button>
        <button
          className={cn("icon-btn press", gpsOk ? "glow-ring" : "text-muted-foreground")}
          aria-label={t("gps")}
          onClick={() => {
            loc.request();
            toast(t("gpsLocating"));
          }}
        >
          {loc.status === "denied" || loc.status === "unavailable" ? (
            <LocateOff className="size-5" />
          ) : (
            <LocateFixed className="size-5" />
          )}
        </button>
        <Link to="/maps" className="icon-btn press" aria-label={t("maps")}>
          <Map className="size-5" />
        </Link>
      </nav>
    </header>
  );
}
