import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type DockId = "radio" | "music" | "apps" | "phone" | "maps";
export type ThemeMode = "night" | "day" | "auto";
export type Lang = "ar" | "en";
export type SceneId = "oasis" | "desert" | "minimal";
export type TextSize = "sm" | "md" | "lg";
export type SpeedSource = "demo" | "gps";
export type WidgetId = "trip" | "prayer" | "music" | "weather";

export const DEFAULT_DOCK: DockId[] = ["radio", "music", "apps", "phone", "maps"];

export interface SettingsState {
  theme: ThemeMode;
  lang: Lang;
  scene: SceneId;
  brightness: number; // 40..100
  textSize: TextSize;
  gaugeScale: number; // 0.85..1.1
  widgets: Record<WidgetId, boolean>;
  dockOrder: DockId[];
  speedSource: SpeedSource;
  fuelRate: number; // assumed litres per 100 km
  fuelPrice: number; // currency per litre
  set: (patch: Partial<Omit<SettingsState, "set" | "toggleWidget" | "moveDock" | "reset">>) => void;
  toggleWidget: (id: WidgetId) => void;
  moveDock: (id: DockId, delta: -1 | 1) => void;
  reset: () => void;
}

const defaults = {
  theme: "night" as ThemeMode,
  lang: "ar" as Lang,
  scene: "oasis" as SceneId,
  brightness: 100,
  textSize: "md" as TextSize,
  gaugeScale: 1,
  widgets: { trip: true, prayer: true, music: true, weather: true },
  dockOrder: DEFAULT_DOCK,
  speedSource: "demo" as SpeedSource,
  fuelRate: 7.5,
  fuelPrice: 17.75,
};

export function moveItem<T>(list: T[], item: T, delta: -1 | 1): T[] {
  const i = list.indexOf(item);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = [...list];
  const a = next[i] as T;
  next[i] = next[j] as T;
  next[j] = a;
  return next;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      set: (patch) => set(patch),
      toggleWidget: (id) => set((s) => ({ widgets: { ...s.widgets, [id]: !s.widgets[id] } })),
      moveDock: (id, delta) => set((s) => ({ dockOrder: moveItem(s.dockOrder, id, delta) })),
      reset: () => set({ ...defaults }),
    }),
    {
      name: "gardenia-settings",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

/** Resolve "auto" to day/night from the local hour (sunrise/sunset hook-in point for later). */
export function resolveTheme(mode: ThemeMode, now: Date): "night" | "day" {
  if (mode !== "auto") return mode;
  const h = now.getHours();
  return h >= 6 && h < 18 ? "day" : "night";
}
