import { createFileRoute } from "@tanstack/react-router";
import carRear from "@/assets/car-rear.png";
import { Speedometer } from "@/components/launcher/Speedometer";
import { TripPanel } from "@/components/launcher/TripPanel";
import { PrayerPanel } from "@/components/launcher/PrayerPanel";
import { MusicBar } from "@/components/launcher/MusicBar";
import { useSettings } from "@/lib/cockpit/settings-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "لوحة القيادة — جاردينيا سمارت كار" },
      { name: "description", content: "عداد سرعة، بيانات الرحلة، مواقيت الصلاة ومشغل الموسيقى في شاشة واحدة للسيارة." },
      { property: "og:title", content: "لوحة القيادة — جاردينيا سمارت كار" },
      { property: "og:description", content: "واجهة Car Launcher عربية بتصميم تركواز مستقبلي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const widgets = useSettings((s) => s.widgets);
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="relative flex min-h-0 flex-1 gap-3">
        <aside className="w-[288px] shrink-0">{widgets.prayer && <PrayerPanel />}</aside>
        <section className="relative flex-1" aria-label="speedometer">
          <Speedometer />
          <img
            src={carRear}
            alt=""
            width={615}
            height={480}
            className="animate-car-bob pointer-events-none absolute bottom-[-4px] left-1/2 w-[196px] drop-shadow-[0_14px_14px_rgb(0_0_0/0.55)]"
          />
        </section>
        <aside className="w-[288px] shrink-0">{widgets.trip && <TripPanel />}</aside>
      </div>
      {widgets.music && <MusicBar />}
    </div>
  );
}
