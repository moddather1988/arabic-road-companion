import { create } from "zustand";

export interface Track {
  title: string;
  artist: string;
  duration: number;
  hue: number;
  url?: string;
}

export const EMPTY_TRACK: Track = {
  title: "اختر ملفًا موسيقيًا",
  artist: "لا توجد أغنية قيد التشغيل",
  duration: 0,
  hue: 188,
};

export const DEMO_TRACKS: Track[] = [];

interface MusicStore {
  tracks: Track[];
  index: number;
  playing: boolean;
  position: number;
  volume: number;
  source: "library" | "radio";
  addFiles: (files: File[]) => void;
  play: (i?: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
  setSource: (s: "library" | "radio") => void;
  tick: (dt: number) => void;
}

let audio: HTMLAudioElement | null = null;

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
      const tracks = [...state.tracks];
      if (tracks[state.index]) {
        tracks[state.index] = {
          ...tracks[state.index],
          duration: Number.isFinite(audio.duration) ? audio.duration : 0,
        };
        useMusic.setState({ tracks });
      }
    });

    audio.addEventListener("play", () => useMusic.setState({ playing: true }));
    audio.addEventListener("pause", () => useMusic.setState({ playing: false }));
    audio.addEventListener("ended", () => useMusic.getState().next());
  }

  return audio;
}

export const useMusic = create<MusicStore>()((set, get) => ({
  tracks: [],
  index: 0,
  playing: false,
  position: 0,
  volume: 60,
  source: "library",

  addFiles: (files) => {
    const valid = files.filter(
      (file) =>
        file.type.startsWith("audio/") ||
        /\.(mp3|m4a|aac|wav|ogg|flac|opus|wma)$/i.test(file.name),
    );

    if (!valid.length) return;

    const added = valid.map((file, i) => ({
      title: file.name.replace(/\.[^.]+$/, ""),
      artist: "ملف من الجهاز",
      duration: 0,
      hue: [188, 232, 160, 205, 250][i % 5],
      url: URL.createObjectURL(file),
    }));

    const startIndex = get().tracks.length;
    set((state) => ({
      tracks: [...state.tracks, ...added],
      index: startIndex,
      position: 0,
      source: "library",
    }));

    get().play(startIndex);
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
    const nextIndex = (state.index + 1) % state.tracks.length;
    get().play(nextIndex);
  },

  prev: () => {
    const state = get();
    const player = getAudio();
    if (!state.tracks.length || !player) return;

    if (player.currentTime > 5) {
      player.currentTime = 0;
      set({ position: 0 });
    } else {
      const previousIndex =
        (state.index - 1 + state.tracks.length) % state.tracks.length;
      get().play(previousIndex);
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
