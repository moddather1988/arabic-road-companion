import { create } from "zustand";

export interface Track {
  title: string;
  artist: string;
  duration: number; // seconds
  hue: number; // album art tint
}

/** Demo playlist – shown labelled as a demo; no audio is streamed in this phase. */
export const DEMO_TRACKS: [Track, ...Track[]] = [
  { title: "طريق الواحة", artist: "قائمة تجريبية", duration: 214, hue: 188 },
  { title: "ليل القاهرة", artist: "قائمة تجريبية", duration: 241, hue: 232 },
  { title: "نسيم الصحراء", artist: "قائمة تجريبية", duration: 198, hue: 160 },
  { title: "على مهل", artist: "قائمة تجريبية", duration: 263, hue: 205 },
  { title: "أضواء المدينة", artist: "قائمة تجريبية", duration: 187, hue: 250 },
];

export function trackAt(i: number): Track {
  return DEMO_TRACKS[i] ?? DEMO_TRACKS[0];
}

interface MusicStore {
  index: number;
  playing: boolean;
  position: number;
  volume: number;
  source: "library" | "radio";
  play: (i?: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
  setSource: (s: "library" | "radio") => void;
  tick: (dt: number) => void;
}

export const useMusic = create<MusicStore>()((set, get) => ({
  index: 0,
  playing: true,
  position: 42,
  volume: 60,
  source: "library",
  play: (i) => set((s) => ({ index: i ?? s.index, position: i === undefined ? s.position : 0, playing: true })),
  toggle: () => set((s) => ({ playing: !s.playing })),
  next: () => set((s) => ({ index: (s.index + 1) % DEMO_TRACKS.length, position: 0 })),
  prev: () =>
    set((s) =>
      s.position > 5
        ? { position: 0 }
        : { index: (s.index - 1 + DEMO_TRACKS.length) % DEMO_TRACKS.length, position: 0 },
    ),
  seek: (sec) => set({ position: sec }),
  setVolume: (v) => set({ volume: v }),
  setSource: (source) => set({ source }),
  tick: (dt) => {
    const s = get();
    if (!s.playing) return;
    const dur = trackAt(s.index).duration;
    if (s.position + dt >= dur) get().next();
    else set({ position: s.position + dt });
  },
}));

export function formatClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
