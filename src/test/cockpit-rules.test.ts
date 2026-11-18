import { describe, expect, it } from "vitest";
import { averageSpeed, fuelEstimate, speedToAngle, stepDemo } from "@/lib/cockpit/drive";
import { nextPrayer, prayerTimesFor } from "@/lib/cockpit/prayer";
import { moveItem, resolveTheme } from "@/lib/cockpit/settings-store";

const GIZA = { lat: 30.0131, lng: 31.2089 };

describe("speedometer scale 0–260 km/h", () => {
  it("maps 0 to the start of the dial and 260 to the end", () => {
    expect(speedToAngle(0)).toBe(-135);
    expect(speedToAngle(260)).toBe(135);
  });
  it("clamps speeds above 260", () => {
    expect(speedToAngle(320)).toBe(135);
  });
});

describe("demo speed simulation", () => {
  it("never jumps more than the acceleration limit per step", () => {
    const next = stepDemo({ speed: 50, target: 140, holdLeft: 10, heading: 0 }, 1, () => 0.5);
    expect(next.speed).toBe(56);
  });
});

describe("trip estimates", () => {
  it("estimates fuel cost from distance, assumed rate and price", () => {
    const f = fuelEstimate(100, 7.5, 20);
    expect(f.litres).toBe(7.5);
    expect(f.cost).toBe(150);
  });
  it("computes average speed from distance and time", () => {
    expect(averageSpeed(60, 3600)).toBe(60);
  });
});

describe("prayer times", () => {
  it("lists the five prayers in order", () => {
    const list = prayerTimesFor(GIZA.lat, GIZA.lng, new Date(2026, 10, 18, 12));
    expect(list.map((p) => p.key)).toEqual(["fajr", "dhuhr", "asr", "maghrib", "isha"]);
  });
  it("rolls over to tomorrow's Fajr after Isha", () => {
    const late = new Date(2026, 10, 18, 23, 50);
    const next = nextPrayer(GIZA.lat, GIZA.lng, late);
    expect(next.key).toBe("fajr");
    expect(next.time.getDate()).toBe(19);
  });
});

describe("settings", () => {
  it("auto theme is day at noon and night at 22:00", () => {
    expect(resolveTheme("auto", new Date(2026, 10, 18, 12))).toBe("day");
    expect(resolveTheme("auto", new Date(2026, 10, 18, 22))).toBe("night");
  });
  it("reorders shortcuts", () => {
    expect(moveItem(["radio", "music", "apps"], "music", -1)).toEqual(["music", "radio", "apps"]);
    expect(moveItem(["radio", "music"], "radio", -1)).toEqual(["radio", "music"]);
  });
});
