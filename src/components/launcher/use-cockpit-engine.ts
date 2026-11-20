import { useEffect, useRef } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { stepDemo, useDrive, type DemoState } from "@/lib/cockpit/drive";
import { useSettings } from "@/lib/cockpit/settings-store";
import { useMusic } from "@/lib/cockpit/music-store";

/** Real GPS speed and position-based trip tracking. */
export function useCockpitEngine() {
  const source = useSettings((s) => s.speedSource);
  const demo = useRef<DemoState>({ speed: 0, target: 70, holdLeft: 4, heading: 30 });

  useEffect(() => {
    const patch = useDrive.getState().patch;

    if (source === "demo") {
      patch({ gps: "off", hasHeading: true });
      demo.current.speed = useDrive.getState().speed;
      let last = performance.now();
      const id = setInterval(() => {
        const now = performance.now();
        const dt = Math.min(0.5, (now - last) / 1000);
        last = now;
        demo.current = stepDemo(demo.current, dt);
        patch({ speed: demo.current.speed, heading: demo.current.heading });
      }, 100);
      return () => clearInterval(id);
    }

    patch({ gps: "waiting", speed: 0, hasHeading: false });
    let cancelled = false;
    let watchId: string | undefined;
    let previous: { lat: number; lon: number; timestamp: number } | null = null;
    let filteredSpeedKmh = 0;
    let lastSpeedTimestamp: number | null = null;

    const startGps = async () => {
      try {
        let permission = await Geolocation.checkPermissions();

        if (permission.location !== "granted") {
          permission = await Geolocation.requestPermissions();
        }

        if (cancelled) return;

        if (permission.location !== "granted") {
          patch({ gps: "denied", speed: 0, hasHeading: false });
          return;
        }

        watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
          (position, error) => {
            if (cancelled) return;

            if (error) {
              const denied = String(error.message ?? error)
                .toLowerCase()
                .includes("permission");
              filteredSpeedKmh = 0;
              lastSpeedTimestamp = null;
              previous = null;
              patch({
                gps: denied ? "denied" : "unavailable",
                speed: 0,
                hasHeading: false,
              });
              return;
            }

            if (!position) return;

            const c = position.coords;
            const timestamp = position.timestamp;
            const accuracy = c.accuracy ?? Infinity;

            // Ignore weak fixes; they can create wildly inaccurate speed readings.
            if (!Number.isFinite(accuracy) || accuracy > 50) {
              previous = null;
              filteredSpeedKmh = 0;
              lastSpeedTimestamp = null;
              patch({ gps: "waiting", speed: 0, hasHeading: false });
              return;
            }

            let distanceMeters = 0;
            let mps = c.speed;

            if (previous) {
              const dt = (timestamp - previous.timestamp) / 1000;
              distanceMeters = haversine(previous.lat, previous.lon, c.latitude, c.longitude);

              if (
                (mps === null || !Number.isFinite(mps)) &&
                dt >= 0.5 &&
                dt <= 10 &&
                distanceMeters >= 3
              ) {
                mps = distanceMeters / dt;
              }

              // Accumulate actual GPS displacement, not estimated speed × timer.
              if (
                dt >= 0.5 &&
                dt <= 10 &&
                distanceMeters >= 2 &&
                distanceMeters <= 200 &&
                mps !== null &&
                Number.isFinite(mps) &&
                mps > 0.5 &&
                mps < 60
              ) {
                useDrive.getState().patch({
                  distanceKm: useDrive.getState().distanceKm + distanceMeters / 1000,
                });
              }
            }

            previous = {
              lat: c.latitude,
              lon: c.longitude,
              timestamp,
            };

            const validSpeed = mps !== null && Number.isFinite(mps) && mps >= 0 && mps < 60;
            const rawSpeedKmh =
              mps !== null && Number.isFinite(mps) && mps >= 0 && mps < 60 ? mps * 3.6 : 0;

            // Suppress tiny GPS movement while stopped.
            const targetSpeedKmh = rawSpeedKmh < 2 ? 0 : rawSpeedKmh;

            const filterDt =
              lastSpeedTimestamp === null
                ? 1
                : Math.min(3, Math.max(0.1, (timestamp - lastSpeedTimestamp) / 1000));

            if (lastSpeedTimestamp === null) {
              filteredSpeedKmh = targetSpeedKmh;
            } else {
              // Limit sudden jumps, then apply adaptive smoothing.
              const accelerating = targetSpeedKmh > filteredSpeedKmh;
              const maxChange = (accelerating ? 25 : 40) * filterDt;
              const limitedTarget =
                filteredSpeedKmh +
                Math.max(-maxChange, Math.min(maxChange, targetSpeedKmh - filteredSpeedKmh));

              const timeConstant = accelerating ? 0.35 : 0.25;
              const alpha = 1 - Math.exp(-filterDt / timeConstant);

              filteredSpeedKmh += (limitedTarget - filteredSpeedKmh) * alpha;
            }

            lastSpeedTimestamp = timestamp;
            const speed = Math.max(0, filteredSpeedKmh);
            const heading = c.heading;

            patch({
              gps: "active",
              speed,
              ...(heading !== null && Number.isFinite(heading) && speed > 1
                ? { heading, hasHeading: true }
                : {}),
            });
          },
        );

        if (cancelled && watchId) {
          await Geolocation.clearWatch({ id: watchId });
        }
      } catch (error) {
        if (!cancelled) {
          const message = String(error).toLowerCase();
          filteredSpeedKmh = 0;
          lastSpeedTimestamp = null;
          previous = null;
          patch({
            gps: message.includes("permission") ? "denied" : "unavailable",
            speed: 0,
            hasHeading: false,
          });
        }
      }
    };

    void startGps();

    return () => {
      cancelled = true;
      if (watchId) void Geolocation.clearWatch({ id: watchId });
    };
  }, [source]);

  // Driving time + demo distance + music clock.
  // GPS distance is accumulated from accepted position updates above.
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;

      const d = useDrive.getState();
      if (d.speed > 1) {
        d.patch({
          drivingSec: d.drivingSec + dt,
          ...(source === "demo" ? { distanceKm: d.distanceKm + (d.speed * dt) / 3600 } : {}),
        });
      }

      useMusic.getState().tick(dt);
    }, 1000);

    return () => clearInterval(id);
  }, [source]);
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
