import { create } from "zustand";

/** Fallback when the browser has not shared a location: Giza, Egypt. */
export const DEFAULT_LOCATION = { lat: 30.0131, lng: 31.2089 };

interface LocationStore {
  lat: number;
  lng: number;
  isDefault: boolean;
  status: "idle" | "locating" | "ok" | "denied" | "unavailable";
  request: () => void;
}

export const useLocation = create<LocationStore>()((set) => ({
  ...DEFAULT_LOCATION,
  isDefault: true,
  status: "idle",
  request: () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      set({ status: "unavailable" });
      return;
    }
    set({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        set({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          isDefault: false,
          status: "ok",
        }),
      (err) => set({ status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    );
  },
}));
