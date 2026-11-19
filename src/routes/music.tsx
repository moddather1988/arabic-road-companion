import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Music2, Disc3, ListMusic, Heart, Search, RefreshCw,
  Play, Pause, SkipBack, SkipForward, Plus, ListPlus
} from "lucide-react";
import { ScreenShell } from "@/components/launcher/ScreenShell";
import { AlbumArt } from "@/components/launcher/AlbumArt";
import { AudioLibrary, type AudioTrack } from "@/lib/native/audio-library";
import { formatClock } from "@/lib/cockpit/music-store";
import { useT } from "@/lib/cockpit/i18n";
import { cn } from "@/lib/utils";

type Tab = "songs" | "albums" | "artists" | "favorites" | "playlists";
type Playlist = { id: string; name: string; trackIds: string[] };

export const Route = createFileRoute("/music")({
  head: () => ({
    meta: [
      { title: "الموسيقى — Moddather" },
      { name: "description", content: "مكتبة الموسيقى ومشغل السيارة." },
    ],
  }),
  component: MusicScreen,
});

function MusicScreen() {
  const { t } = useT();
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [tab, setTab] = useState<Tab>("songs");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      setFavorites(JSON.parse(localStorage.getItem("moddather-favorites") || "[]"));
      setPlaylists(JSON.parse(localStorage.getItem("moddather-playlists") || "[]"));
    } catch {
      setFavorites([]);
      setPlaylists([]);
    }
    void scanLibrary();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const state = await AudioLibrary.state();
        setPlaying(state.playing);
        setPosition(Math.max(0, state.position / 1000));
        setDuration(Math.max(0, state.duration / 1000));
        if (state.index >= 0) setCurrent(state.index);
      } catch {
        // Native player may still be connecting.
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  async function scanLibrary() {
    setLoading(true);
    setMessage("");
    try {
      const result = await AudioLibrary.scan();
      setTracks(result.tracks || []);
      setMessage(
        result.tracks.length
          ? `تم العثور على ${result.tracks.length} ملف صوتي`
          : "لم يتم العثور على ملفات صوتية مفهرسة على الجهاز"
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر الوصول إلى مكتبة الموسيقى");
    } finally {
      setLoading(false);
    }
  }

  async function playTrack(index: number, list = tracks) {
    try {
      await AudioLibrary.setQueue({ tracks: list, index });
      setCurrent(index);
      setPlaying(true);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تشغيل الأغنية");
    }
  }

  function saveFavorites(ids: string[]) {
    setFavorites(ids);
    localStorage.setItem("moddather-favorites", JSON.stringify(ids));
  }

  function toggleFavorite(id: string) {
    saveFavorites(
      favorites.includes(id)
        ? favorites.filter((item) => item !== id)
        : [...favorites, id]
    );
  }

  function createPlaylist() {
    const name = window.prompt("اكتب اسم قائمة التشغيل");
    if (!name?.trim()) return;
    const playlist = {
      id: `${Date.now()}`,
      name: name.trim(),
      trackIds: tracks.map((track) => track.id),
    };
    const updated = [...playlists, playlist];
    setPlaylists(updated);
    localStorage.setItem("moddather-playlists", JSON.stringify(updated));
    setMessage("تم إنشاء قائمة التشغيل");
  }

  const albums = useMemo(() => {
    const groups = new Map<string, AudioTrack[]>();
    tracks.forEach((track) => {
      const name = track.album || "ألبوم غير معروف";
      groups.set(name, [...(groups.get(name) || []), track]);
    });
    return Array.from(groups.entries());
  }, [tracks]);

  const artists = useMemo(() => {
    const groups = new Map<string, AudioTrack[]>();
    tracks.forEach((track) => {
      const name = track.artist || "فنان غير معروف";
      groups.set(name, [...(groups.get(name) || []), track]);
    });
    return Array.from(groups.entries());
  }, [tracks]);

  const visibleTracks = useMemo(() => {
    let list = tracks;
    if (tab === "favorites") {
      list = tracks.filter((track) => favorites.includes(track.id));
    }
    if (tab === "playlists") {
      list = [];
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((track) =>
        `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tracks, tab, favorites, search]);

  async function togglePlayback() {
    try {
      if (playing) await AudioLibrary.pause();
      else await AudioLibrary.play();
      setPlaying(!playing);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر التحكم في المشغل");
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof Music2 }[] = [
    { id: "songs", label: "الأغاني", icon: Music2 },
    { id: "albums", label: "الألبومات", icon: Disc3 },
    { id: "artists", label: "الفنانون", icon: ListMusic },
    { id: "favorites", label: "المفضلة", icon: Heart },
    { id: "playlists", label: "قوائم التشغيل", icon: ListPlus },
  ];

  return (
    <ScreenShell title={t("music")} icon={Music2} note="مكتبة الموسيقى">
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "press flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold",
                  tab === id ? "bg-primary/20 text-primary" : "bg-background/40 text-foreground/75"
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void scanLibrary()}
              className="press rounded-xl bg-background/50 p-3 text-primary"
              title="تحديث المكتبة"
            >
              <RefreshCw className={cn("size-5", loading && "animate-spin")} />
            </button>
            <button
              onClick={createPlaylist}
              className="press flex items-center gap-2 rounded-xl bg-primary px-3 py-2 font-bold text-primary-foreground"
            >
              <Plus className="size-4" />
              قائمة جديدة
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-background/40 px-3 py-2">
          <Search className="size-5 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث عن أغنية أو فنان أو ألبوم..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <span className="text-xs text-muted-foreground">{tracks.length} أغنية</span>
        </div>

        {message && (
          <div className="rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary">
            {message}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          {tab === "albums" || tab === "artists" ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {(tab === "albums" ? albums : artists)
                .filter(([name]) => !search || name.toLowerCase().includes(search.toLowerCase()))
                .map(([name, group]) => (
                  <button
                    key={name}
                    onClick={() => void playTrack(0, group)}
                    className="press flex items-center gap-3 rounded-xl bg-background/40 p-3 text-start hover:bg-primary/10"
                  >
                    <AlbumArt hue={188} className="size-14 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{name}</span>
                      <span className="text-xs text-muted-foreground">{group.length} أغنية</span>
                    </span>
                    <Play className="size-5 text-primary" />
                  </button>
                ))}
            </div>
          ) : tab === "playlists" ? (
            <div className="flex flex-col gap-2">
              {playlists.map((playlist) => {
                const list = playlist.trackIds
                  .map((id) => tracks.find((track) => track.id === id))
                  .filter((track): track is AudioTrack => Boolean(track));
                return (
                  <button
                    key={playlist.id}
                    onClick={() => void playTrack(0, list)}
                    disabled={!list.length}
                    className="press flex items-center gap-3 rounded-xl bg-background/40 p-3 text-start"
                  >
                    <ListMusic className="size-7 text-primary" />
                    <span className="flex-1 font-bold">{playlist.name}</span>
                    <span className="text-xs text-muted-foreground">{list.length} أغنية</span>
                    <Play className="size-5 text-primary" />
                  </button>
                );
              })}
              {!playlists.length && (
                <p className="p-6 text-center text-muted-foreground">لم تنشئ قوائم تشغيل بعد</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {visibleTracks.map((track) => {
                const index = tracks.findIndex((item) => item.id === track.id);
                return (
                  <div
                    key={track.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2",
                      current === index ? "active-band glow-ring text-primary" : "hover:bg-primary/10"
                    )}
                  >
                    <button onClick={() => void playTrack(index)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                      <AlbumArt hue={188} className="size-10 shrink-0" iconClass="size-4" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{track.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {track.artist} · {track.album}
                        </span>
                      </span>
                      <span dir="ltr" className="text-xs text-muted-foreground">
                        {formatClock(track.duration / 1000)}
                      </span>
                    </button>
                    <button
                      onClick={() => toggleFavorite(track.id)}
                      className="press p-2"
                      aria-label="إضافة للمفضلة"
                    >
                      <Heart className={cn("size-5", favorites.includes(track.id) ? "fill-current text-red-500" : "text-muted-foreground")} />
                    </button>
                  </div>
                );
              })}
              {!visibleTracks.length && (
                <div className="p-8 text-center text-muted-foreground">
                  {loading ? "جاري قراءة مكتبة الموسيقى..." : "لا توجد أغاني هنا حاليًا"}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="glass flex shrink-0 items-center gap-3 rounded-2xl p-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold">
              {current >= 0 ? tracks[current]?.title : "لا توجد أغنية قيد التشغيل"}
            </div>
            <div className="text-xs text-muted-foreground">
              {current >= 0 ? tracks[current]?.artist : "اختر أغنية من مكتبتك"}
            </div>
          </div>
          <button onClick={() => void AudioLibrary.previous().then(() => setCurrent((v) => Math.max(0, v - 1))).catch(() => {})} className="press p-2">
            <SkipBack className="size-5" />
          </button>
          <button onClick={() => void togglePlayback()} className="press rounded-full bg-primary p-3 text-primary-foreground">
            {playing ? <Pause className="size-6" /> : <Play className="size-6" />}
          </button>
          <button onClick={() => void AudioLibrary.next().then(() => setCurrent((v) => v + 1)).catch(() => {})} className="press p-2">
            <SkipForward className="size-5" />
          </button>
          <span dir="ltr" className="text-xs text-muted-foreground">
            {formatClock(position)} / {formatClock(duration)}
          </span>
        </div>
      </div>
    </ScreenShell>
  );
}
