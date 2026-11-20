import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Geolocation } from "@capacitor/geolocation";
import { stepDemo, useDrive, type DemoState } from "@/lib/cockpit/drive";
import { useSettings } from "@/lib/cockpit/settings-store";
import { useMusic } from "@/lib/cockpit/music-store";

export function useCockpitEngine() {
  const source = useSettings((s) => s.speedSource);
  const demo = useRef<DemoState>({
    speed: 0,
    target: 70,
    holdLeft: 4,
    heading: 30,
  });

  useEffect(() => {
    const patch = useDrive.getState().patch;

    if (source === "demo") {
      patch({ gps: "off", hasHeading: true });
      demo.current.speed = useDrive.getState().speed;

      let last = performance.now();
      const id = window.setInterval(() => {
        const now = performance.now();
        const dt = Math.min(0.5, (now - last) / 1000);
        last = now;
        demo.current = stepDemo(demo.current, dt);
        patch({
          speed: demo.current.speed,
          heading: demo.current.heading,
          hasHeading: true,
        });
      }, 100);

      return () => window.clearInterval(id);
    }

    let disposed = false;
    let generation = 0;
    let watchId: string | undefined;
    let appHandle: { remove: () => Promise<void> } | undefined;
    let previous: {
      lat: number;
      lon: number;
      timestamp: number;
    } | null = null;

    let filteredSpeed = 0;
    let lastSpeedTimestamp: number | null = null;
    let lastFixAt = 0;
    let lastWatchdogReset = 0;
    let speedSamples: number[] = [];

    const resetFilter = () => {
      previous = null;
      filteredSpeed = 0;
      lastSpeedTimestamp = null;
      speedSamples = [];
    };

    const clearCurrentWatch = async () => {
      const oldId = watchId;
      watchId = undefined;
      if (oldId) {
        try {
          await Geolocation.clearWatch({ id: oldId });
        } catch (error) {
          console.warn("[GPS] clearWatch failed", error);
        }
      }
    };

    const stopGps = async () => {
      const stopGeneration = ++generation;
      await clearCurrentWatch();

      // Ignore an old stop operation if GPS has already resumed.
      if (disposed || stopGeneration !== generation) return;

      resetFilter();
      patch({ speed: 0, gps: "waiting", hasHeading: false });
    };

    const startGps = async () => {
      if (disposed || document.visibilityState === "hidden") return;

      const currentGeneration = ++generation;
      await clearCurrentWatch();

      if (disposed || currentGeneration !== generation) return;

      resetFilter();
      lastFixAt = Date.now();
      patch({ gps: "waiting", speed: 0, hasHeading: false });

      try {
        let permission = await Geolocation.checkPermissions();

        if (permission.location !== "granted") {
          permission = await Geolocation.requestPermissions();
        }

        if (disposed || currentGeneration !== generation) return;

        if (permission.location !== "granted") {
          patch({ gps: "denied", speed: 0, hasHeading: false });
          return;
        }

        const id = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 1000,
          },
          (position, error) => {
            if (disposed || currentGeneration !== generation) return;

            if (error) {
              console.warn("[GPS] position error", error);
              patch({
                gps: "unavailable",
                speed: 0,
                hasHeading: false,
              });
              resetFilter();
              return;
            }

            if (!position) return;

            const c = position.coords;
            const timestamp = position.timestamp;
            const accuracy = c.accuracy ?? Infinity;

            if (
              !Number.isFinite(c.latitude) ||
              !Number.isFinite(c.longitude) ||
              !Number.isFinite(timestamp) ||
              !Number.isFinite(accuracy) ||
              accuracy > 50
            ) {
              patch({ gps: "waiting", speed: 0, hasHeading: false });
              resetFilter();
              return;
            }

            lastFixAt = Date.now();

            let distanceMeters = 0;
            let dt = 0;

            if (previous) {
              dt = (timestamp - previous.timestamp) / 1000;

              if (dt > 0 && dt <= 10) {
                distanceMeters = haversine(previous.lat, previous.lon, c.latitude, c.longitude);

                // Never count a large jump or a stale position as trip distance.
                if (
                  dt >= 0.8 &&
                  accuracy <= 35 &&
                  distanceMeters >= 3 &&
                  distanceMeters <= Math.min(120, dt * 45)
                ) {
                  useDrive.getState().patch({
                    distanceKm: useDrive.getState().distanceKm + distanceMeters / 1000,
                  });
                }
              }
            }

            previous = {
              lat: c.latitude,
              lon: c.longitude,
              timestamp,
            };

            const reportedMps = c.speed;
            let rawSpeed = 0;

            if (
              reportedMps !== null &&
              Number.isFinite(reportedMps) &&
              reportedMps >= 0 &&
              reportedMps < 60
            ) {
              rawSpeed = reportedMps * 3.6;
            } else if (dt >= 0.8 && dt <= 8 && distanceMeters >= 3) {
              rawSpeed = (distanceMeters / dt) * 3.6;
            }

            // Remove small GPS drift while stationary.
            if (rawSpeed < 2) rawSpeed = 0;

            speedSamples.push(rawSpeed);
            if (speedSamples.length > 3) speedSamples.shift();

            const sorted = [...speedSamples].sort((a, b) => a - b);
            const target = sorted[Math.floor(sorted.length / 2)] ?? 0;

            const filterDt =
              lastSpeedTimestamp === null
                ? 0.5
                : Math.min(2, Math.max(0.1, (timestamp - lastSpeedTimestamp) / 1000));

            if (lastSpeedTimestamp === null) {
              filteredSpeed = target;
            } else {
              const accelerating = target > filteredSpeed;
              const maxRate = accelerating ? 14 : 22;
              const limitedTarget =
                filteredSpeed +
                Math.max(-maxRate * filterDt, Math.min(maxRate * filterDt, target - filteredSpeed));

              const alpha = 1 - Math.exp(-filterDt / 0.65);
              filteredSpeed += (limitedTarget - filteredSpeed) * alpha;
            }

            lastSpeedTimestamp = timestamp;

            const speed = Math.max(0, filteredSpeed);
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

        if (disposed || currentGeneration !== generation) {
          await Geolocation.clearWatch({ id });
          return;
        }

        watchId = id;
      } catch (error) {
        if (!disposed && currentGeneration === generation) {
          console.error("[GPS] start failed", error);
          const message = String(error).toLowerCase();
          patch({
            gps: message.includes("permission") ? "denied" : "unavailable",
            speed: 0,
            hasHeading: false,
          });
          resetFilter();
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void startGps();
      } else {
        void stopGps();
      }
    };

    const watchdog = window.setInterval(() => {
      if (disposed || document.visibilityState === "hidden") return;

      const now = Date.now();
      if (lastFixAt && now - lastFixAt > 12000 && now - lastWatchdogReset > 12000) {
        lastWatchdogReset = now;
        void startGps();
      }
    }, 3000);

    document.addEventListener("visibilitychange", onVisibilityChange);

    void App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        void startGps();
      } else {
        void stopGps();
      }
    })
      .then((handle) => {
        if (disposed) {
          void handle.remove();
        } else {
          appHandle = handle;
        }
      })
      .catch((error) => {
        console.warn("[GPS] App lifecycle listener unavailable", error);
      });

    void startGps();

    return () => {
      disposed = true;
      generation++;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(watchdog);
      if (appHandle) void appHandle.remove();
      void clearCurrentWatch();
    };
  }, [source]);

  // Count only foreground driving time; never add a long background suspension.
  useEffect(() => {
    let last = performance.now();

    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(2, Math.max(0, (now - last) / 1000));
      last = now;

      if (document.visibilityState === "hidden") return;

      const d = useDrive.getState();

      if (d.speed > 1) {
        d.patch({
          drivingSec: d.drivingSec + dt,
          ...(source === "demo" ? { distanceKm: d.distanceKm + (d.speed * dt) / 3600 } : {}),
        });
      }

      useMusic.getState().tick(dt);
    }, 1000);

    return () => window.clearInterval(id);
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
