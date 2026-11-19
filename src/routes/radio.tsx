import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, Radio, Wifi } from "lucide-react";
import { ScreenShell } from "@/components/launcher/ScreenShell";
import { useMusic, type RadioStation } from "@/lib/cockpit/music-store";
import { useT } from "@/lib/cockpit/i18n";
import { cn } from "@/lib/utils";
import { CarRadio } from "@/lib/cockpit/car-radio";

export const Route = createFileRoute("/radio")({
  head: () => ({
    meta: [
      { title: "الراديو — جاردينيا سمارت كار" },
      { name: "description", content: "استمع إلى محطات الراديو عبر الإنترنت." },
      { property: "og:title", content: "الراديو — جاردينيا سمارت كار" },
      { property: "og:description", content: "محطات راديو مباشرة." },
    ],
  }),
  component: RadioScreen,
});

const STATIONS: RadioStation[] = [
  {
    id: "mishary-alafasi",
    name: "إذاعة مشاري العفاسي",
    url: "https://qurango.net/radio/mishary_alafasi",
  },
  {
    id: "quran-cairo",
    name: "إذاعة القرآن الكريم من القاهرة",
    url: "https://stream.radiojar.com/8s5u5tpdtwzuv",
  },
  {
    id: "om-kalthoum",
    name: "راديو أم كلثوم",
    url: "https://stream.zeno.fm/zsgrfxg71s8uv",
  },
];

function RadioScreen() {
  const { t } = useT();
  const music = useMusic();

  const active = music.radioStation;
  const isPlaying = music.source === "radio" && music.playing;

  const toggleRadio = () => {
    if (music.source === "radio" && active) {
      music.toggle();
      return;
    }

    if (active) {
      music.playRadio(active);
      return;
    }

    const first = STATIONS[0];
    if (first) music.playRadio(first);
  };

  return (
    <ScreenShell title={t("radio")} icon={Radio} note={t("radioNote")}>
      <div className="grid h-full grid-cols-[1.2fr_1fr] gap-6">
        <div className="glass flex flex-col items-center justify-center gap-5 rounded-2xl p-6 text-center">
          <div className="flex items-center gap-2 text-sm font-bold text-primary">
            <Wifi className="h-4 w-4" />
            بث مباشر عبر الإنترنت
          </div>

          <div className="flex h-28 w-28 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
            <Radio className="h-14 w-14 text-primary glow-text" />
          </div>

          <div className="min-h-16">
            <div className="text-2xl font-bold">
              {active?.name ?? "اختر محطة للاستماع"}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {isPlaying ? "يعمل الآن" : "الراديو متوقف"}
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                const result = await CarRadio.open();
                window.alert(result.message);
              } catch {
                window.alert("تعذر فتح راديو السيارة.");
              }
            }}
            className="press rounded-xl border border-primary/40 px-5 py-3 text-sm font-bold text-primary"
          >
            راديو السيارة FM الأصلي
          </button>

          <button
            type="button"
            onClick={toggleRadio}
            disabled={!active && !STATIONS.length}
            className="press flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
            aria-label={isPlaying ? "إيقاف الراديو" : "تشغيل الراديو"}
          >
            {isPlaying
              ? <Pause className="h-7 w-7" />
              : <Play className="h-7 w-7" />}
          </button>
        </div>

        <div className="flex flex-col">
          <h2 className="mb-3 text-sm font-bold text-muted-foreground">
            {t("stations")}
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {STATIONS.map((station) => {
              const selected =
                music.source === "radio" && active?.id === station.id;

              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => music.playRadio(station)}
                  className={cn(
                    "press glass flex items-center gap-4 rounded-xl px-4 py-4 text-start",
                    selected && "glow-ring text-primary",
                  )}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Radio className="h-6 w-6 text-primary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{station.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      بث إنترنت مباشر
                    </div>
                  </div>

                  {selected && isPlaying && (
                    <span className="text-xs font-bold text-primary">LIVE</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
