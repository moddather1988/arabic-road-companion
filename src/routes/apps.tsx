import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, CircleGauge, CloudSun, Gauge, Globe, LayoutGrid, MapPin, MoonStar, Music2, Phone, Radio, Settings } from "lucide-react";
import { toast } from "sonner";
import { ScreenShell } from "@/components/launcher/ScreenShell";
import { useT, type TKey } from "@/lib/cockpit/i18n";

export const Route = createFileRoute("/apps")({
  head: () => ({
    meta: [
      { title: "التطبيقات — جاردينيا سمارت كار" },
      { name: "description", content: "جميع تطبيقات واجهة السيارة." },
      { property: "og:title", content: "التطبيقات — جاردينيا سمارت كار" },
      { property: "og:description", content: "اختصارات التطبيقات في شاشة السيارة." },
    ],
  }),
  component: AppsScreen,
});

type Tile = { icon: typeof Radio; label: TKey; to?: "/" | "/settings" | "/radio" | "/music" | "/phone" | "/maps" };
const TILES: Tile[] = [
  { icon: Gauge, label: "home", to: "/" },
  { icon: MapPin, label: "maps", to: "/maps" },
  { icon: Music2, label: "music", to: "/music" },
  { icon: Radio, label: "radio", to: "/radio" },
  { icon: Phone, label: "phone", to: "/phone" },
  { icon: Settings, label: "settings", to: "/settings" },
  { icon: MoonStar, label: "prayerTimes", to: "/" },
  { icon: CloudSun, label: "weather" },
  { icon: Camera, label: "cameras" },
  { icon: CircleGauge, label: "tires" },
  { icon: Globe, label: "browser" },
];

function AppsScreen() {
  const { t } = useT();
  const cls = "press glass flex flex-col items-center justify-center gap-2 rounded-2xl py-5 hover:glow-ring";
  return (
    <ScreenShell title={t("allApps")} icon={LayoutGrid}>
      <div className="grid grid-cols-6 gap-3">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          const inner = (
            <>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Icon className="size-6" />
              </span>
              <span className="text-sm font-bold">{t(tile.label)}</span>
              {!tile.to && <span className="text-[10px] text-muted-foreground">{t("comingSoon")}</span>}
            </>
          );
          return tile.to ? (
            <Link key={tile.label} to={tile.to} className={cls}>
              {inner}
            </Link>
          ) : (
            <button key={tile.label} className={cls} onClick={() => toast(t("comingSoon"))}>
              {inner}
            </button>
          );
        })}
      </div>
    </ScreenShell>
  );
}
