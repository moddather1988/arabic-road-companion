import { create } from "zustand";

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  hue: number;
  url?: string;
}

export interface MusicPlaylist {
  id: string;
  name: string;
  trackIds: string[];
}

interface SavedTrack extends Omit<Track, "url"> {
  blob: Blob;
}

interface MusicStore {
  tracks: Track[];
  index: number;
  playing: boolean;
  position: number;
  volume: number;
  source: "library" | "radio";
  favorites: string[];
  playlists: MusicPlaylist[];
  libraryReady: boolean;
  addFiles: (files: File[]) => void;
  play: (i?: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
  setSource: (s: "library" | "radio") => void;
  toggleFavorite: (id: string) => void;
  createPlaylist: (name: string) => void;
  addToPlaylist: (playlistId: string, trackId: string) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  tick: (dt: number) => void;
}

const DB_NAME = "moddather-music-library";
const DB_VERSION = 1;

let audio: HTMLAudioElement | null = null;
let libraryInit: Promise<void> | null = null;

function openLibrary(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("tracks")) {
        db.createObjectStore("tracks", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveTrack(record: SavedTrack) {
  const db = await openLibrary();
  const tx = db.transaction("tracks", "readwrite");
  tx.objectStore("tracks").put(record);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

async function saveLibraryState(favorites: string[], playlists: MusicPlaylist[]) {
  const db = await openLibrary();
  const tx = db.transaction("settings", "readwrite");
  tx.objectStore("settings").put({
    key: "library-state",
    favorites,
    playlists,
  });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

export async function initializeMusicLibrary() {
  if (libraryInit) return libraryInit;

  libraryInit = (async () => {
    if (typeof indexedDB === "undefined") {
      useMusic.setState({ libraryReady: true });
      return;
    }

    try {
      const db = await openLibrary();
      const tx = db.transaction(["tracks", "settings"], "readonly");
      const savedTracks = await requestResult(
        tx.objectStore("tracks").getAll() as IDBRequest<SavedTrack[]>,
      );
      const savedState = await requestResult(
        tx.objectStore("settings").get("library-state"),
      ) as { favorites?: string[]; playlists?: MusicPlaylist[] } | undefined;
      db.close();

      const tracks = savedTracks.map(({ blob, ...track }) => ({
        ...track,
        url: URL.createObjectURL(blob),
      }));

      useMusic.setState({
        tracks,
        favorites: savedState?.favorites ?? [],
        playlists: savedState?.playlists ?? [],
        libraryReady: true,
      });
    } catch (error) {
      console.error("Music library restore failed:", error);
      useMusic.setState({ libraryReady: true });
    }
  })();

  return libraryInit;
}

async function updateSavedDuration(id: string, duration: number) {
  try {
    const db = await openLibrary();
    const tx = db.transaction("tracks", "readwrite");
    const store = tx.objectStore("tracks");
    const record = await requestResult(store.get(id)) as SavedTrack | undefined;
    if (record) store.put({ ...record, duration });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  } catch (error) {
    console.warn("Could not update saved track duration:", error);
  }
}

function getAudio() {
  if (typeof Audio === "undefined") return null;

  if (!audio) {
    audio = new Audio();
    audio.preload = "metadata";

    audio.addEventListener("timeupdate", () => {
      if (audio) useMusic.setState({ position: audio.currentTime });
    });

    audio.addEventListener("loadedmetadata", () => {
      if (!audio) return;
      const state = useMusic.getState();
      const current = state.tracks[state.index];
      if (!current) return;

      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const tracks = [...state.tracks];
      tracks[state.index] = { ...current, duration };
      useMusic.setState({ tracks });
      void updateSavedDuration(current.id, duration);
    });

    audio.addEventListener("play", () => useMusic.setState({ playing: true }));
    audio.addEventListener("pause", () => useMusic.setState({ playing: false }));
    audio.addEventListener("ended", () => useMusic.getState().next());
  }

  return audio;
}

export const EMPTY_TRACK: Track = {
  id: "empty",
  title: "اختر ملفًا موسيقيًا",
  artist: "بيانات الفنان غير متاحة",
  album: "ألبوم غير محدد",
  duration: 0,
  hue: 188,
};

export const DEMO_TRACKS: Track[] = [];

export const useMusic = create<MusicStore>()((set, get) => ({
  tracks: [],
  index: 0,
  playing: false,
  position: 0,
  volume: 60,
  source: "library",
  favorites: [],
  playlists: [],
  libraryReady: false,

  addFiles: (files) => {
    const valid = files.filter(
      (file) =>
        file.type.startsWith("audio/") ||
        /\.(mp3|m4a|aac|wav|ogg|flac|opus|wma)$/i.test(file.name),
    );

    if (!valid.length) return;

    void (async () => {
      const startIndex = get().tracks.length;
      const added: Track[] = [];

      for (let i = 0; i < valid.length; i++) {
        const file = valid[i];
        if (!file) continue;

        const id = typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${file.name}-${file.size}-${file.lastModified}`;

        const track: Track = {
          id,
          title: file.name.replace(/\.[^.]+$/, ""),
          artist: "فنان غير محدد",
          album: "ألبوم غير محدد",
          duration: 0,
          hue: [188, 232, 160, 205, 250][i % 5] ?? 188,
          url: URL.createObjectURL(file),
        };

        try {
          await saveTrack({
            id: track.id,
            title: track.title,
            artist: track.artist,
            album: track.album,
            duration: track.duration,
            hue: track.hue,
            blob: file,
          });
        } catch (error) {
          console.error("Could not save music file:", error);
        }

        added.push(track);
      }

      if (!added.length) return;

      set((state) => ({
        tracks: [...state.tracks, ...added],
        index: startIndex,
        position: 0,
        source: "library",
      }));

      get().play(startIndex);
    })();
  },

  play: (i) => {
    const state = get();
    const index = i ?? state.index;
    const track = state.tracks[index];

    if (!track?.url) {
      set({ playing: false });
      return;
    }

    const player = getAudio();
    if (!player) return;

    player.volume = state.volume / 100;

    if (player.src !== new URL(track.url, window.location.href).href) {
      player.src = track.url;
      player.currentTime = 0;
      set({ index, position: 0 });
    } else if (i !== undefined && i !== state.index) {
      player.currentTime = 0;
      set({ index, position: 0 });
    }

    void player.play().catch(() => set({ playing: false }));
  },

  toggle: () => {
    const player = getAudio();
    if (!player) return;

    if (!player.paused) {
      player.pause();
      return;
    }

    get().play();
  },

  next: () => {
    const state = get();
    if (!state.tracks.length) return;
    get().play((state.index + 1) % state.tracks.length);
  },

  prev: () => {
    const state = get();
    const player = getAudio();
    if (!state.tracks.length || !player) return;

    if (player.currentTime > 5) {
      player.currentTime = 0;
      set({ position: 0 });
    } else {
      get().play((state.index - 1 + state.tracks.length) % state.tracks.length);
    }
  },

  seek: (sec) => {
    const player = getAudio();
    if (!player || !Number.isFinite(sec)) return;
    player.currentTime = Math.max(0, Math.min(sec, player.duration || sec));
    set({ position: player.currentTime });
  },

  setVolume: (v) => {
    const volume = Math.max(0, Math.min(100, v));
    const player = getAudio();
    if (player) player.volume = volume / 100;
    set({ volume });
  },

  setSource: (source) => set({ source }),

  toggleFavorite: (id) => {
    const favorites = get().favorites.includes(id)
      ? get().favorites.filter((item) => item !== id)
      : [...get().favorites, id];

    set({ favorites });
    void saveLibraryState(favorites, get().playlists);
  },

  createPlaylist: (name) => {
    const cleanName = name.trim();
    if (!cleanName) return;

    const playlist: MusicPlaylist = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: cleanName,
      trackIds: [],
    };

    const playlists = [...get().playlists, playlist];
    set({ playlists });
    void saveLibraryState(get().favorites, playlists);
  },

  addToPlaylist: (playlistId, trackId) => {
    const playlists = get().playlists.map((playlist) =>
      playlist.id === playlistId && !playlist.trackIds.includes(trackId)
        ? { ...playlist, trackIds: [...playlist.trackIds, trackId] }
        : playlist,
    );
    set({ playlists });
    void saveLibraryState(get().favorites, playlists);
  },

  removeFromPlaylist: (playlistId, trackId) => {
    const playlists = get().playlists.map((playlist) =>
      playlist.id === playlistId
        ? { ...playlist, trackIds: playlist.trackIds.filter((id) => id !== trackId) }
        : playlist,
    );
    set({ playlists });
    void saveLibraryState(get().favorites, playlists);
  },

  tick: () => {},
}));

export function trackAt(i: number): Track {
  return useMusic.getState().tracks[i] ?? EMPTY_TRACK;
}

export function formatClock(sec: number) {
  const safe = Number.isFinite(sec) ? Math.max(0, sec) : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
