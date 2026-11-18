import { create } from "zustand";

export const GAUGE_MAX = 260;
export const GAUGE_SWEEP = 270; // degrees, from -135 to +135

/** Map a speed (km/h) to a needle angle in degrees, 0 at 12 o'clock. Clamped to 0..260. */
export function speedToAngle(speed: number): number {
  const s = Math.max(0, Math.min(GAUGE_MAX, speed));
  return -GAUGE_SWEEP / 2 + (s / GAUGE_MAX) * GAUGE_SWEEP;
}

export interface DemoState {
  speed: number;
  target: number;
  holdLeft: number; // seconds until a new target
  heading: number;
}

/** One step of the clearly-labelled demo driving simulation. Smooth acceleration, no jumps. */
export function stepDemo(s: DemoState, dt: number, rand: () => number = Math.random): DemoState {
  let { target, holdLeft } = s;
  holdLeft -= dt;
  if (holdLeft <= 0) {
    target = 35 + rand() * 105; // 35..140 km/h
    holdLeft = 6 + rand() * 8;
  }
  const diff = target - s.speed;
  const maxAccel = diff > 0 ? 6 : 9; // km/h per second
  const change = Math.sign(diff) * Math.min(Math.abs(diff), maxAccel * dt);
  const heading = (s.heading + (rand() - 0.5) * 2 * dt + 360) % 360;
  return { speed: Math.max(0, s.speed + change), target, holdLeft, heading };
}

export function fuelEstimate(distanceKm: number, litresPer100: number, pricePerLitre: number) {
  const litres = (distanceKm * litresPer100) / 100;
  return { litres, cost: litres * pricePerLitre };
}

export function averageSpeed(distanceKm: number, drivingSec: number): number {
  if (drivingSec < 1) return 0;
  return distanceKm / (drivingSec / 3600);
}

export function headingLabel(deg: number, lang: "ar" | "en"): string {
  const ar = ["شمال", "شمال شرق", "شرق", "جنوب شرق", "جنوب", "جنوب غرب", "غرب", "شمال غرب"];
  const en = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const i = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return (lang === "ar" ? ar : en)[i] ?? "";
}

export type GpsStatus = "off" | "waiting" | "active" | "denied" | "unavailable";

interface DriveStore {
  speed: number;
  heading: number;
  hasHeading: boolean;
  distanceKm: number;
  drivingSec: number;
  gps: GpsStatus;
  patch: (p: Partial<Omit<DriveStore, "patch" | "resetTrip">>) => void;
  resetTrip: () => void;
}

export const useDrive = create<DriveStore>()((set) => ({
  speed: 0,
  heading: 30,
  hasHeading: true,
  distanceKm: 0,
  drivingSec: 0,
  gps: "off",
  patch: (p) => set(p),
  resetTrip: () => set({ distanceKm: 0, drivingSec: 0 }),
}));
