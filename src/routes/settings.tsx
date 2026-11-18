import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Car, Languages, LayoutDashboard, Palette, RotateCcw, Settings } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ScreenShell } from "@/components/launcher/ScreenShell";
import { DOCK_META } from "@/components/launcher/Dock";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useT, type TKey } from "@/lib/cockpit/i18n";
import { useSettings, type WidgetId } from "@/lib/cockpit/settings-store";
import { useDrive } from "@/lib/cockpit/drive";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — جاردينيا سمارت كار" },
      { name: "description", content: "تخصيص الثيم والخلفية والإضاءة والودجات والاختصارات." },
      { property: "og:title", content: "الإعدادات — جاردينيا سمارت كار" },
      { property: "og:description", content: "إعدادات تخصيص واجهة السيارة." },
    ],
  }),
  component: SettingsScreen,
});

type Section = "appearance" | "layout" | "driving" | "language";
const SECTIONS: { id: Section; icon: typeof Palette }[] = [
  { id: "appearance", icon: Palette },
  { id: "layout", icon: LayoutDashboard },
  { id: "driving", icon: Car },
  { id: "language", icon: Languages },
];

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-xl bg-background/50 p-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "press rounded-lg px-4 py-1.5 text-sm font-bold",
            value === o.v ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:text-primary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-primary/15 py-3 last:border-0">
      <div>
        <div className="font-bold">{label}</div>
        {note && <div className="mt-0.5 text-xs text-muted-foreground">{note}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-3">{children}</div>
    </div>
  );
}

function SettingsScreen() {
  const { t, dir } = useT();
  const s = useSettings();
  const resetTrip = useDrive((d) => d.resetTrip);
  const [sec, setSec] = useState<Section>("appearance");
  const widgetKeys: { id: WidgetId; label: TKey }[] = [
    { id: "trip", label: "widgetTrip" },
    { id: "prayer", label: "widgetPrayer" },
    { id: "music", label: "widgetMusic" },
    { id: "weather", label: "widgetWeather" },
  ];

  return (
    <ScreenShell title={t("settings")} icon={Settings}>
      <div className="grid h-full grid-cols-[200px_1fr] gap-5">
        <nav className="flex flex-col gap-1.5">
          {SECTIONS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSec(id)}
              className={cn(
                "press flex items-center gap-3 rounded-xl px-4 py-2.5 text-start font-bold",
                sec === id ? "active-band glow-ring text-primary" : "text-foreground/85 hover:bg-primary/10",
              )}
            >
              <Icon className="size-5" />
              {t(id)}
            </button>
          ))}
          <button
            onClick={s.reset}
            className="press mt-auto flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-muted-foreground hover:text-destructive"
          >
            <RotateCcw className="size-4" />
            {t("resetAll")}
          </button>
        </nav>

        <div key={sec} className="min-h-0 overflow-auto pe-2 animate-screen-in">
          {sec === "appearance" && (
            <>
              <Field label={t("theme")} note={t("autoNote")}>
                <Segmented
                  value={s.theme}
                  onChange={(v) => s.set({ theme: v })}
                  options={[
                    { v: "night", label: t("nightMode") },
                    { v: "day", label: t("dayMode") },
                    { v: "auto", label: t("autoMode") },
                  ]}
                />
              </Field>
              <Field label={t("background")}>
                <Segmented
                  value={s.scene}
                  onChange={(v) => s.set({ scene: v })}
                  options={[
                    { v: "oasis", label: t("sceneOasis") },
                    { v: "desert", label: t("sceneDesert") },
                    { v: "minimal", label: t("sceneMinimal") },
                  ]}
                />
              </Field>
              <Field label={t("brightness")}>
                <span className="w-10 text-center font-display text-lg font-bold tnum">{s.brightness}%</span>
                <Slider dir={dir} className="w-56" value={[s.brightness]} min={40} max={100} step={5} onValueChange={([v]) => s.set({ brightness: v ?? 100 })} />
              </Field>
              <Field label={t("textSize")}>
                <Segmented
                  value={s.textSize}
                  onChange={(v) => s.set({ textSize: v })}
                  options={[
                    { v: "sm", label: t("small") },
                    { v: "md", label: t("medium") },
                    { v: "lg", label: t("large") },
                  ]}
                />
              </Field>
              <Field label={t("gaugeSize")}>
                <Segmented
                  value={String(s.gaugeScale)}
                  onChange={(v) => s.set({ gaugeScale: Number(v) })}
                  options={[
                    { v: "0.88", label: t("small") },
                    { v: "1", label: t("medium") },
                    { v: "1.06", label: t("large") },
                  ]}
                />
              </Field>
            </>
          )}

          {sec === "layout" && (
            <>
              <h3 className="mb-1 text-sm font-bold text-primary">{t("widgets")}</h3>
              {widgetKeys.map((w) => (
                <Field key={w.id} label={t(w.label)}>
                  <Switch checked={s.widgets[w.id]} onCheckedChange={() => s.toggleWidget(w.id)} />
                </Field>
              ))}
              <h3 className="mb-1 mt-4 text-sm font-bold text-primary">{t("shortcutsOrder")}</h3>
              <ol className="flex flex-col gap-1.5">
                {s.dockOrder.map((id, i) => {
                  const Icon = DOCK_META[id].icon;
                  return (
                    <li key={id} className="glass flex items-center gap-3 rounded-xl px-4 py-2">
                      <span className="w-5 font-display font-bold text-muted-foreground">{i + 1}</span>
                      <Icon className="size-5 text-primary" />
                      <span className="flex-1 font-bold">{t(DOCK_META[id].label)}</span>
                      <button className="icon-btn press size-9" disabled={i === 0} onClick={() => s.moveDock(id, -1)} aria-label={t("moveUp")}>
                        <ArrowUp className="size-4" />
                      </button>
                      <button
                        className="icon-btn press size-9"
                        disabled={i === s.dockOrder.length - 1}
                        onClick={() => s.moveDock(id, 1)}
                        aria-label={t("moveDown")}
                      >
                        <ArrowDown className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </>
          )}

          {sec === "driving" && (
            <>
              <Field label={t("speedSource")} note={t("gpsNote")}>
                <Segmented
                  value={s.speedSource}
                  onChange={(v) => s.set({ speedSource: v })}
                  options={[
                    { v: "demo", label: t("demo") },
                    { v: "gps", label: "GPS" },
                  ]}
                />
              </Field>
              <Field label={t("fuelRate")} note={t("fuelNote")}>
                <span className="w-24 text-center font-display text-lg font-bold tnum">
                  {s.fuelRate.toFixed(1)} <span className="text-xs">{t("lPer100")}</span>
                </span>
                <Slider dir={dir} className="w-48" value={[s.fuelRate]} min={3} max={20} step={0.5} onValueChange={([v]) => s.set({ fuelRate: v ?? 7.5 })} />
              </Field>
              <Field label={t("fuelPrice")}>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.25}
                  value={s.fuelPrice}
                  onChange={(e) => s.set({ fuelPrice: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-28 rounded-xl border border-input bg-background/50 px-3 py-1.5 text-center font-display text-lg font-bold outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-sm text-muted-foreground">{t("currency")}</span>
              </Field>
              <Field label={t("resetTrip")}>
                <button onClick={resetTrip} className="press rounded-xl bg-primary/15 px-4 py-2 text-sm font-bold text-primary">
                  {t("resetTrip")}
                </button>
              </Field>
            </>
          )}

          {sec === "language" && (
            <Field label={t("language")}>
              <Segmented
                value={s.lang}
                onChange={(v) => s.set({ lang: v })}
                options={[
                  { v: "ar", label: t("arabic") },
                  { v: "en", label: t("english") },
                ]}
              />
            </Field>
          )}
        </div>
      </div>
    </ScreenShell>
  );
}
