import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@/lib/cockpit/location-store";

export interface Weather {
  temp: number;
  code: number;
  isDay: boolean;
}

/** Live weather from Open-Meteo (free, no key) for the current or default location. */
export function useWeather() {
  const lat = useLocation((s) => s.lat);
  const lng = useLocation((s) => s.lng);
  return useQuery({
    queryKey: ["weather", lat.toFixed(2), lng.toFixed(2)],
    queryFn: async (): Promise<Weather> => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("weather");
      const j = await res.json();
      return { temp: j.current.temperature_2m, code: j.current.weather_code, isDay: j.current.is_day === 1 };
    },
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    retry: 1,
  });
}
