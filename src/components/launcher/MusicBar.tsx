import { Link } from "@tanstack/react-router";
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { AlbumArt } from "./AlbumArt";
import { EMPTY_TRACK, formatClock, useMusic } from "@/lib/cockpit/music-store";
import { useT } from "@/lib/cockpit/i18n";
import { cn } from "@/lib/utils";

const EQ = Array.from({ length: 18 }, (_, i) => i);

export function Transport({ big = false }: { big?: boolean }) {
  const { t, dir } = useT();
  const m = useMusic();
  const sz = big ? "size-7" : "size-5";
  const Prev = dir === "rtl" ? SkipForward : SkipBack;
  const Next = dir === "rtl" ? SkipBack : SkipForward;

  return (
    <div className="flex items-center gap-3">
      {m.source !== "radio" && (
        <button className="press rounded-full p-2 text-foreground hover:text-primary" onClick={m.prev} aria-label={t("previous")}>
          <Prev className={sz} />
        </button>
      )}
      <button
        className={cn(
          "press flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)]",
          big ? "size-16" : "size-10",
        )}
        onClick={m.toggle}
        aria-label={t("playPause")}
      >
        {m.playing ? <Pause className={sz} /> : <Play className={sz} />}
      </button>
      {m.source !== "radio" && (
        <button className="press rounded-full p-2 text-foreground hover:text-primary" onClick={m.next} aria-label={t("next")}>
          <Next className={sz} />
        </button>
      )}
    </div>
  );
}

export function Progress() {
  const { dir } = useT();
  const m = useMusic();
  const track = m.tracks[m.index] ?? EMPTY_TRACK;

  return (
    <div className="flex w-full items-center gap-2 text-[11px] font-medium text-muted-foreground tnum">
      <span dir="ltr">{formatClock(m.position)}</span>
      {m.source === "radio" ? (
        <div className="flex-1 text-center text-xs font-bold text-primary">
          بث مباشر عبر الإنترنت
        </div>
      ) : (
        <>
          <Slider
            dir={dir}
            value={[Math.min(m.position, track.duration || 1)]}
            max={Math.max(track.duration, 1)}
            step={1}
            onValueChange={([v]) => m.seek(v ?? 0)}
            className="flex-1"
            disabled={!track.duration}
          />
          <span dir="ltr">{formatClock(track.duration)}</span>
        </>
      )}
    </div>
  );
}

export function MusicBar() {
  const { t, dir } = useT();
  const m = useMusic();
  const track = m.tracks[m.index] ?? EMPTY_TRACK;
  const isRadio = m.source === "radio";
  const displayTitle = isRadio
    ? m.radioStation?.name ?? "راديو الإنترنت"
    : track.title;
  const displayArtist = isRadio
    ? "بث مباشر عبر الإنترنت"
    : track.artist;

  return (
    <div className="glass flex h-[64px] shrink-0 items-center gap-4 rounded-2xl px-3 animate-screen-in">
      <Link to={isRadio ? "/radio" : "/music"} className="press flex w-[230px] items-center gap-3">
        <AlbumArt hue={track.hue} className="size-11" />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold">{displayTitle}</div>
          <div className="truncate text-[11px] text-muted-foreground">{displayArtist}</div>
        </div>
      </Link>

      <div className="flex flex-1 items-center gap-4">
        <Transport />
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex h-3 items-center justify-center gap-[3px]" aria-hidden>
            {EQ.map((i) => (
              <span
                key={i}
                className={cn("h-3 w-[3px] rounded-full bg-primary/80", m.playing ? "animate-eq" : "scale-y-[0.3]")}
                style={{ animationDelay: `${(i * 73) % 600}ms` }}
              />
            ))}
          </div>
          <Progress />
        </div>
      </div>

      <div className="flex w-[150px] items-center gap-2 text-primary">
        <button className="press" onClick={() => m.setVolume(m.volume ? 0 : 60)} aria-label={t("volume")}>
          {m.volume ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </button>
        <Slider dir={dir} value={[m.volume]} max={100} step={1} onValueChange={([v]) => m.setVolume(v ?? 0)} />
      </div>

      <div className="flex items-center gap-1 rounded-xl bg-background/40 p-1 text-sm font-bold">
        <label className="press cursor-pointer rounded-lg bg-primary/20 px-3 py-1.5 text-primary">
          {t("library")}
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
        <Link to="/radio" className="press rounded-lg px-3 py-1.5 text-foreground/80 hover:text-primary">
          {t("radio")}
        </Link>
      </div>
    </div>
  );
}
