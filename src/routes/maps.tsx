import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, MapPin } from "lucide-react";
import { ScreenShell } from "@/components/launcher/ScreenShell";
import { useT } from "@/lib/cockpit/i18n";
import { useLocation } from "@/lib/cockpit/location-store";

export const Route = createFileRoute("/maps")({
  head: () => ({
    meta: [
      { title: "الخرائط — جاردينيا سمارت كار" },
      { name: "description", content: "خريطة حول موقعك الحالي." },
      { property: "og:title", content: "الخرائط — جاردينيا سمارت كار" },
      { property: "og:description", content: "عرض الخريطة وفتح الملاحة." },
    ],
  }),
  component: MapsScreen,
});

function MapsScreen() {
  const { t } = useT();
  const { lat, lng, isDefault } = useLocation();
  const d = 0.03;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d * 1.8}%2C${lat - d}%2C${lng + d * 1.8}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
  return (
    <ScreenShell title={t("maps")} icon={MapPin} note={`${t("mapNote")} ${isDefault ? `(${t("defaultLocation")})` : ""}`}>
      <div className="relative h-full overflow-hidden rounded-2xl border border-panel-border">
        <iframe title="map" src={src} className="h-full w-full border-0" loading="lazy" />
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          className="press glass-strong absolute bottom-3 start-3 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-primary"
        >
          <ExternalLink className="size-4" />
          {t("openGoogleMaps")}
        </a>
      </div>
    </ScreenShell>
  );
}
