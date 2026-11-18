import { useEffect, useRef } from "react";
import { stepDemo, useDrive, type DemoState } from "@/lib/cockpit/drive";
import { useSettings } from "@/lib/cockpit/settings-store";
import { useMusic } from "@/lib/cockpit/music-store";

/** Runs the speed source (demo simulation or real GPS), the trip integrator and the music clock. */
export function useCockpitEngine() {
  const source = useSettings((s) => s.speedSource);
  const demo = useRef<DemoState>({ speed: 0, target: 70, holdLeft: 4, heading: 30 });

  // Speed source
  useEffect(() => {
    const patch = useDrive.getState().patch;
    if (source === "demo") {
      patch({ gps: "off", hasHeading: true });
      demo.current.speed = useDrive.getState().speed;
      let last = performance.now();
      const id = setInterval(() => {
        const t = performance.now();
        const dt = Math.min(0.5, (t - last) / 1000);
        last = t;
        demo.current = stepDemo(demo.current, dt);
        patch({ speed: demo.current.speed, heading: demo.current.heading });
      }, 100);
      return () => clearInterval(id);
    }
    if (!navigator.geolocation) {
      patch({ gps: "unavailable", speed: 0 });
      return;
    }
    patch({ gps: "waiting", speed: 0, hasHeading: false });
    let prev: GeolocationPosition | null = null;
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        let mps = pos.coords.speed;
        if ((mps === null || Number.isNaN(mps)) && prev) {
          const dt = (pos.timestamp - prev.timestamp) / 1000;
          if (dt > 0) mps = haversine(prev.coords, pos.coords) / dt;
        }
        prev = pos;
        const h = pos.coords.heading;
        patch({
          gps: "active",
          speed: Math.max(0, (mps ?? 0) * 3.6),
          ...(h !== null && !Number.isNaN(h) ? { heading: h, hasHeading: true } : {}),
        });
      },
      (err) => patch({ gps: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable", speed: 0 }),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [source]);

  // Trip integrator + music clock (1 Hz)
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const t = performance.now();
      const dt = (t - last) / 1000;
      last = t;
      const d = useDrive.getState();
      if (d.speed > 1) {
        d.patch({ distanceKm: d.distanceKm + (d.speed * dt) / 3600, drivingSec: d.drivingSec + dt });
      }
      useMusic.getState().tick(dt);
    }, 1000);
    return () => clearInterval(id);
  }, []);
}

function haversine(a: GeolocationCoordinates, b: GeolocationCoordinates) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
