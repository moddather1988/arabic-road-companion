import { CalculationMethod, Coordinates, PrayerTimes } from "adhan";

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
export const PRAYER_KEYS: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export interface PrayerEntry {
  key: PrayerKey;
  time: Date;
}

/** Real astronomical calculation (Egyptian General Authority of Survey method). */
export function prayerTimesFor(lat: number, lng: number, date: Date): PrayerEntry[] {
  const p = new PrayerTimes(new Coordinates(lat, lng), date, CalculationMethod.Egyptian());
  return [
    { key: "fajr", time: p.fajr },
    { key: "dhuhr", time: p.dhuhr },
    { key: "asr", time: p.asr },
    { key: "maghrib", time: p.maghrib },
    { key: "isha", time: p.isha },
  ];
}

/** The next prayer after `now`; after Isha it rolls over to tomorrow's Fajr. */
export function nextPrayer(lat: number, lng: number, now: Date): PrayerEntry {
  const today = prayerTimesFor(lat, lng, now);
  const upcoming = today.find((p) => p.time.getTime() > now.getTime());
  if (upcoming) return upcoming;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return prayerTimesFor(lat, lng, tomorrow)[0]!;
}

export function countdownParts(target: Date, now: Date) {
  const total = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}
