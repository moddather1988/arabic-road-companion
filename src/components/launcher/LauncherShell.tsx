import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Stage } from "./Stage";
import { RoadScene } from "./RoadScene";
import { TopBar } from "./TopBar";
import { Dock } from "./Dock";
import { useCockpitEngine } from "./use-cockpit-engine";
import { resolveTheme, useSettings } from "@/lib/cockpit/settings-store";
import { useLocation } from "@/lib/cockpit/location-store";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";

export function LauncherShell({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(useSettings.persist.hasHydrated());
  useEffect(() => {
    if (ready) return;
    Promise.resolve(useSettings.persist.rehydrate()).finally(() => setReady(true));
  }, [ready]);

  useEffect(() => {
    useLocation.getState().request();
  }, []);

  if (!ready) return <BootSplash />;
  return <Cockpit>{children}</Cockpit>;
}

function Cockpit({ children }: { children: ReactNode }) {
  useCockpitEngine();
  const s = useSettings();
  const now = useNow(60_000);
  const mode = resolveTheme(s.theme, now);
  const isHome = useRouterState({ select: (r) => r.location.pathname === "/" });

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("day", mode === "day");
    html.lang = s.lang;
    html.dir = s.lang === "ar" ? "rtl" : "ltr";
    html.dataset["text"] = s.textSize;
  }, [mode, s.lang, s.textSize]);

  return (
    <>
      <Stage>
        {(width) => (
          <>
            <RoadScene width={width} mode={mode} scene={s.scene} />
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-background transition-opacity duration-500",
                isHome ? "opacity-0" : "opacity-45",
              )}
            />
            <div className="relative z-10 flex h-full flex-col gap-2.5 p-3">
              <TopBar />
              <main className="min-h-0 flex-1">{children}</main>
              <Dock />
            </div>
            <div
              className="dimmer pointer-events-none absolute inset-0 z-50 transition-opacity"
              style={{ opacity: ((100 - s.brightness) / 100) * 0.75 }}
            />
          </>
        )}
      </Stage>
      <Toaster position="top-center" dir={s.lang === "ar" ? "rtl" : "ltr"} duration={2500} />
    </>
  );
}

export function BootSplash() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background text-primary">
      <div className="size-12 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      <span className="font-display text-xl font-bold tracking-[0.3em]">MODDATHER</span>
    </div>
  );
}
