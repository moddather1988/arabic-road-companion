import { Capacitor } from "@capacitor/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Disc3,
  Heart,
  ListMusic,
  Music2,
  Plus,
  Search,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { ScreenShell } from "@/components/launcher/ScreenShell";
import { AlbumArt } from "@/components/launcher/AlbumArt";
import { Progress, Transport } from "@/components/launcher/MusicBar";
import {
  EMPTY_TRACK,
  formatClock,
  initializeMusicLibrary,
  addStorageChangeListener,
  pickNativeMusicFiles,
  useMusic,
} from "@/lib/cockpit/music-store";
import { useT } from "@/lib/cockpit/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/music")({
  head: () => ({
    meta: [
      { title: "الموسيقى — Moddather" },
      { name: "description", content: "مكتبة الموسيقى في Moddather." },
    ],
  }),
  component: MusicScreen,
});

type LibraryTab = "songs" | "albums" | "artists" | "favorites" | "playlists";

const tabs: { id: LibraryTab; label: string; icon: typeof Music2 }[] = [
  { id: "songs", label: "الأغاني", icon: Music2 },
  { id: "albums", label: "الألبومات", icon: Disc3 },
  { id: "artists", label: "الفنانون", icon: Users },
  { id: "favorites", label: "المفضلة", icon: Heart },
  { id: "playlists", label: "قوائم التشغيل", icon: ListMusic },
];

function MusicScreen() {
  const { t } = useT();
  const m = useMusic();
  const track = m.tracks[m.index] ?? EMPTY_TRACK;
  const [tab, setTab] = useState<LibraryTab>("songs");
  const [search, setSearch] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [libraryMessage, setLibraryMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    let storageListener: { remove: () => Promise<void> } | null = null;

    const refreshLibrary = () => {
      if (
        active &&
        document.visibilityState === "visible" &&
        useMusic.getState().libraryReady
      ) {
        void useMusic.getState().scanDeviceLibrary().catch((error) => {
          console.warn("Automatic music refresh failed:", error);
        });
      }
    };

    const libraryWasAlreadyReady = useMusic.getState().libraryReady;

    void initializeMusicLibrary().then(async () => {
      if (!active) return;

      // Initial setup already scans once. On later page entries, scan again.
      if (libraryWasAlreadyReady) {
        await useMusic.getState().scanDeviceLibrary().catch((error) => {
          console.warn("Music page entry scan failed:", error);
        });
      }

      if (!active) return;

      storageListener = await addStorageChangeListener(() => {
        refreshLibrary();
      });
    }).catch((error) => {
      console.error("Music library initialization failed:", error);
    });

    document.addEventListener("visibilitychange", refreshLibrary);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", refreshLibrary);
      if (storageListener) void storageListener.remove();
    };
  }, []);

  const albums = useMemo(() => {
    const groups = new Map<string, number>();
    m.tracks.forEach((item) => groups.set(item.album, (groups.get(item.album) ?? 0) + 1));
    return Array.from(groups, ([name, count]) => ({ name, count }));
  }, [m.tracks]);

  const artists = useMemo(() => {
    const groups = new Map<string, number>();
    m.tracks.forEach((item) => groups.set(item.artist, (groups.get(item.artist) ?? 0) + 1));
    return Array.from(groups, ([name, count]) => ({ name, count }));
  }, [m.tracks]);

  const visibleTracks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    let result = m.tracks;

    if (tab === "favorites") {
      result = result.filter((item) => m.favorites.includes(item.id));
    } else if (tab === "playlists") {
      const playlist = m.playlists.find((item) => item.id === selectedPlaylist);
      result = playlist
        ? result.filter((item) => playlist.trackIds.includes(item.id))
        : [];
    } else if (tab === "albums" && selectedGroup) {
      result = result.filter((item) => item.album === selectedGroup);
    } else if (tab === "artists" && selectedGroup) {
      result = result.filter((item) => item.artist === selectedGroup);
    }

    if (query) {
      result = result.filter((item) =>
        `${item.title} ${item.artist} ${item.album}`.toLocaleLowerCase().includes(query),
      );
    }

    return result;
  }, [m.tracks, m.favorites, m.playlists, tab, selectedPlaylist, selectedGroup, search]);

  const createPlaylist = () => {
    const name = playlistName.trim();
    if (!name) return;
    m.createPlaylist(name);
    setPlaylistName("");
    setSelectedPlaylist(m.playlists[m.playlists.length - 1]?.id ?? "");
  };

  const showTracks = (nextTab: LibraryTab) => {
    setTab(nextTab);
    setSelectedGroup("");
  };

  return (
    <ScreenShell title={t("music")} icon={Music2} note="مكتبة الموسيقى المحلية">
      <div className="grid h-full min-h-0 grid-cols-[0.9fr_1.1fr] gap-5">
        <div className="flex min-h-0 flex-col items-center justify-center gap-4 rounded-2xl bg-background/25 p-4">
          <AlbumArt hue={track.hue} className="size-44 rounded-3xl shadow-[var(--shadow-glow)]" iconClass="size-16" />
          <div className="w-full text-center">
            <div className="text-xs font-bold text-primary">{t("nowPlaying")}</div>
            <div className="truncate text-xl font-extrabold">{track.title}</div>
            <div className="truncate text-sm text-muted-foreground">{track.artist}</div>
            <div className="mt-1 truncate text-xs text-muted-foreground">{track.album}</div>
          </div>
          <div className="w-full max-w-md">
            <Progress />
          </div>
          <Transport big />
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              disabled={importing}
              onClick={async () => {
                if (!Capacitor.isNativePlatform()) {
                  fileInputRef.current?.click();
                  return;
                }

                setImporting(true);
                setLibraryMessage("");
                try {
                  const files = await pickNativeMusicFiles();
                  if (!files.length) {
                    setLibraryMessage("لم يتم اختيار ملفات صوتية");
                  } else {
                    m.addFiles(files);
                    setLibraryMessage(`تم اختيار ${files.length} ملف صوتي`);
                  }
                } catch (error) {
                  console.error("Native music picker failed:", error);
                  setLibraryMessage("تعذر فتح مدير الملفات. راجع سجل التطبيق.");
                } finally {
                  setImporting(false);
                }
              }}
              className="press rounded-xl bg-primary/15 px-5 py-3 text-center font-bold text-primary hover:bg-primary/25"
            >
              {importing ? "جارٍ استيراد الملفات..." : "+ اختيار ملفات الموسيقى"}
            </button>
            <button
              type="button"
              disabled={scanning}
              onClick={async () => {
                setScanning(true);
                try {
                  await m.scanDeviceLibrary();
                  setLibraryMessage(`اكتمل الفحص. عدد الأغاني: ${useMusic.getState().tracks.length}`);
                } catch (error) {
                  console.error("Music scan failed:", error);
                  setLibraryMessage(
                    error instanceof Error
                      ? `فشل فحص المكتبة: ${error.message}`
                      : "فشل فحص المكتبة. تحقق من صلاحية الملفات."
                  );
                } finally {
                  setScanning(false);
                }
              }}
              className="press flex items-center gap-2 rounded-xl bg-background/50 px-4 py-3 font-bold text-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn("size-4", scanning && "animate-spin")} />
              {scanning ? "جارٍ الفحص..." : "تحديث المكتبة"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac,.opus,.wma"
              multiple
              className="sr-only"
              onChange={(event) => {
                m.addFiles(Array.from(event.currentTarget.files ?? []));
                event.currentTarget.value = "";
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {m.libraryReady
              ? `${m.tracks.length} أغنية في المكتبة`
              : "جارٍ تحميل مكتبتك..."}
          </div>
          {libraryMessage && (
            <div role="status" className="mt-1 text-xs text-primary">
              {libraryMessage}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-background/20 p-3">
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-background/50 px-3 py-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث عن أغنية أو فنان أو ألبوم..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="مسح البحث">
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => showTracks(item.id)}
                  className={cn(
                    "press flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold",
                    tab === item.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-background/50 text-muted-foreground hover:bg-primary/10",
                  )}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {tab === "albums" && (
            <div className="mb-2 flex min-h-0 shrink-0 flex-nowrap gap-1.5 overflow-x-auto overflow-y-hidden pb-1">
              {albums.map((album) => (
                <button
                  key={album.name}
                  onClick={() => setSelectedGroup(selectedGroup === album.name ? "" : album.name)}
                  title={`${album.name} (${album.count} أغنية)`}
                  className={cn(
                    "flex max-w-[170px] shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold",
                    selectedGroup === album.name
                      ? "bg-primary text-primary-foreground"
                      : "bg-background/50 text-foreground",
                  )}
                >
                  <Disc3 className="size-3 shrink-0" />
                  <span className="truncate">{album.name}</span>
                  <span className="shrink-0 opacity-75">({album.count})</span>
                </button>
              ))}
            </div>
          )}

          {tab === "artists" && (
            <div className="mb-2 flex min-h-0 shrink-0 flex-nowrap gap-1.5 overflow-x-auto overflow-y-hidden pb-1">
              {artists.map((artist) => (
                <button
                  key={artist.name}
                  onClick={() => setSelectedGroup(selectedGroup === artist.name ? "" : artist.name)}
                  title={`${artist.name} (${artist.count} أغنية)`}
                  className={cn(
                    "flex max-w-[170px] shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold",
                    selectedGroup === artist.name
                      ? "bg-primary text-primary-foreground"
                      : "bg-background/50 text-foreground",
                  )}
                >
                  <Users className="size-3 shrink-0" />
                  <span className="truncate">{artist.name}</span>
                  <span className="shrink-0 opacity-75">({artist.count})</span>
                </button>
              ))}
            </div>
          )}

          {tab === "playlists" && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input
                value={playlistName}
                onChange={(event) => setPlaylistName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") createPlaylist();
                }}
                placeholder="اسم قائمة التشغيل الجديدة"
                className="min-w-0 flex-1 rounded-lg bg-background/50 px-3 py-2 text-xs outline-none"
              />
              <button
                onClick={createPlaylist}
                disabled={!playlistName.trim()}
                className="press flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
              >
                <Plus className="size-4" />
                إنشاء
              </button>
              {m.playlists.length > 0 && (
                <select
                  value={selectedPlaylist}
                  onChange={(event) => setSelectedPlaylist(event.target.value)}
                  className="w-full rounded-lg bg-background/50 px-3 py-2 text-xs"
                >
                  <option value="">اختر قائمة تشغيل</option>
                  {m.playlists.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>{playlist.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="mb-2 flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>
              {tab === "favorites" ? "الأغاني المفضلة" :
                tab === "playlists" ? "محتويات قائمة التشغيل" :
                tab === "albums" ? "أغاني الألبوم" :
                tab === "artists" ? "أغاني الفنان" : "كل الأغاني"}
            </span>
            <span>{visibleTracks.length} أغنية</span>
          </div>

          <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto">
            {visibleTracks.map((item) => {
              const originalIndex = m.tracks.findIndex((entry) => entry.id === item.id);
              const favorite = m.favorites.includes(item.id);

              return (
                <li key={item.id}>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-2 py-2",
                      originalIndex === m.index ? "active-band glow-ring text-primary" : "hover:bg-primary/10",
                    )}
                  >
                    <button
                      onClick={() => m.play(originalIndex)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-start"
                    >
                      <AlbumArt hue={item.hue} className="size-10 shrink-0" iconClass="size-4" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{item.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.artist} · {item.album}
                        </span>
                      </span>
                      <span dir="ltr" className="font-display text-xs text-muted-foreground tnum">
                        {formatClock(item.duration)}
                      </span>
                    </button>

                    <button
                      onClick={() => m.toggleFavorite(item.id)}
                      aria-label={favorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                      className={cn("rounded-lg p-2", favorite ? "text-rose-500" : "text-muted-foreground")}
                    >
                      <Heart className={cn("size-4", favorite && "fill-current")} />
                    </button>

                    {tab === "playlists" && selectedPlaylist && (
                      <button
                        onClick={() => m.removeFromPlaylist(selectedPlaylist, item.id)}
                        aria-label="إزالة من القائمة"
                        className="rounded-lg p-2 text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-4" />
                      </button>
                    )}

                    {tab !== "playlists" && m.playlists.length > 0 && (
                      <button
                        onClick={() => {
                          const target = selectedPlaylist || m.playlists[0]?.id;
                          if (target) m.addToPlaylist(target, item.id);
                        }}
                        aria-label="إضافة إلى قائمة التشغيل"
                        title="إضافة إلى قائمة التشغيل"
                        className="rounded-lg p-2 text-muted-foreground hover:text-primary"
                      >
                        <Plus className="size-4" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}

            {!visibleTracks.length && (
              <li className="rounded-xl bg-background/30 p-6 text-center text-sm text-muted-foreground">
                {tab === "favorites"
                  ? "لم تضف أي أغنية إلى المفضلة بعد"
                  : tab === "playlists"
                    ? "اختر قائمة تشغيل أو أنشئ قائمة جديدة"
                    : search
                      ? "لا توجد نتائج مطابقة للبحث"
                      : "لم تتم إضافة ملفات موسيقية بعد"}
              </li>
            )}
          </ul>
        </div>
      </div>
    </ScreenShell>
  );
}
