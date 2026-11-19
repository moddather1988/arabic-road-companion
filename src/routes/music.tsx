import { createFileRoute } from "@tanstack/react-router";
import { Music2 } from "lucide-react";
import { ScreenShell } from "@/components/launcher/ScreenShell";
import { AlbumArt } from "@/components/launcher/AlbumArt";
import { Progress, Transport } from "@/components/launcher/MusicBar";
import { EMPTY_TRACK, formatClock, useMusic } from "@/lib/cockpit/music-store";
import { useT } from "@/lib/cockpit/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/music")({
  head: () => ({
    meta: [
      { title: "الموسيقى — Moddather" },
      { name: "description", content: "مشغل الموسيقى في واجهة السيارة." },
    ],
  }),
  component: MusicScreen,
});

function MusicScreen() {
  const { t } = useT();
  const m = useMusic();
  const track = m.tracks[m.index] ?? EMPTY_TRACK;

  return (
    <ScreenShell title={t("music")} icon={Music2} note="اختر ملفات الموسيقى من جهازك">
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
          <label className="press cursor-pointer rounded-xl bg-primary/15 px-5 py-3 font-bold text-primary hover:bg-primary/25">
            اختيار ملفات الموسيقى
            <input
              type="file"
              accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac"
              multiple
              className="hidden"
              onChange={(event) => {
                m.addFiles(Array.from(event.currentTarget.files ?? []));
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <div className="flex min-h-0 flex-col">
          <h2 className="mb-2 text-sm font-bold text-muted-foreground">{t("playlist")}</h2>
          <ul className="flex flex-col gap-1.5 overflow-auto">
            {m.tracks.map((tr, i) => (
              <li key={`${tr.url}-${i}`}>
                <button
                  onClick={() => m.play(i)}
                  className={cn(
                    "press flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start",
                    i === m.index ? "active-band glow-ring text-primary" : "hover:bg-primary/10",
                  )}
                >
                  <AlbumArt hue={tr.hue} className="size-10" iconClass="size-4" />
                  <span className="flex-1 truncate font-bold">{tr.title}</span>
                  <span dir="ltr" className="font-display text-sm text-muted-foreground tnum">
                    {formatClock(tr.duration)}
                  </span>
                </button>
              </li>
            ))}
            {!m.tracks.length && (
              <li className="rounded-xl bg-background/30 p-5 text-center text-sm text-muted-foreground">
                لم تتم إضافة ملفات موسيقية بعد
              </li>
            )}
          </ul>
        </div>
      </div>
    </ScreenShell>
  );
}
