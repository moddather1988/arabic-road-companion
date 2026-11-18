import { createFileRoute } from "@tanstack/react-router";
import { Music2 } from "lucide-react";
import { ScreenShell } from "@/components/launcher/ScreenShell";
import { AlbumArt } from "@/components/launcher/AlbumArt";
import { Progress, Transport } from "@/components/launcher/MusicBar";
import { DEMO_TRACKS, trackAt, formatClock, useMusic } from "@/lib/cockpit/music-store";
import { useT } from "@/lib/cockpit/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/music")({
  head: () => ({
    meta: [
      { title: "الموسيقى — جاردينيا سمارت كار" },
      { name: "description", content: "مشغل الموسيقى في واجهة السيارة." },
      { property: "og:title", content: "الموسيقى — جاردينيا سمارت كار" },
      { property: "og:description", content: "قائمة التشغيل والتحكم في الصوت." },
    ],
  }),
  component: MusicScreen,
});

function MusicScreen() {
  const { t } = useT();
  const m = useMusic();
  const track = trackAt(m.index);
  return (
    <ScreenShell title={t("music")} icon={Music2} note={t("demoPlaylist")}>
      <div className="grid h-full grid-cols-[1fr_1.1fr] gap-6">
        <div className="flex flex-col items-center justify-center gap-4">
          <AlbumArt hue={track.hue} className="size-48 rounded-3xl shadow-[var(--shadow-glow)]" iconClass="size-16" />
          <div className="text-center">
            <div className="text-xs font-bold text-primary">{t("nowPlaying")}</div>
            <div className="text-2xl font-extrabold">{track.title}</div>
            <div className="text-sm text-muted-foreground">{track.artist}</div>
          </div>
          <div className="w-full max-w-md">
            <Progress />
          </div>
          <Transport big />
        </div>
        <div className="flex min-h-0 flex-col">
          <h2 className="mb-2 text-sm font-bold text-muted-foreground">{t("playlist")}</h2>
          <ul className="flex flex-col gap-1.5 overflow-auto">
            {DEMO_TRACKS.map((tr, i) => (
              <li key={tr.title}>
                <button
                  onClick={() => m.play(i)}
                  className={cn(
                    "press flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start",
                    i === m.index ? "active-band glow-ring text-primary" : "hover:bg-primary/10",
                  )}
                >
                  <AlbumArt hue={tr.hue} className="size-10" iconClass="size-4" />
                  <span className="flex-1 font-bold">{tr.title}</span>
                  <span dir="ltr" className="font-display text-sm text-muted-foreground tnum">
                    {formatClock(tr.duration)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ScreenShell>
  );
}
