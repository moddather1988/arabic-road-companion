import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, MapPin, Music2, Phone, Radio } from "lucide-react";
import { Fragment } from "react";
import { useT, type TKey } from "@/lib/cockpit/i18n";
import { useSettings, type DockId } from "@/lib/cockpit/settings-store";
import { cn } from "@/lib/utils";

export const DOCK_META: Record<DockId, { icon: typeof Radio; label: TKey; to: "/radio" | "/music" | "/apps" | "/phone" | "/maps" }> = {
  radio: { icon: Radio, label: "radio", to: "/radio" },
  music: { icon: Music2, label: "music", to: "/music" },
  apps: { icon: LayoutGrid, label: "apps", to: "/apps" },
  phone: { icon: Phone, label: "phone", to: "/phone" },
  maps: { icon: MapPin, label: "maps", to: "/maps" },
};

export function Dock() {
  const order = useSettings((s) => s.dockOrder);
  const { t } = useT();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="glass flex h-[88px] shrink-0 items-stretch rounded-2xl px-2">
      {order.map((id, i) => {
        const m = DOCK_META[id];
        const Icon = m.icon;
        const active = path === m.to;
        return (
          <Fragment key={id}>
            {i > 0 && <span className="my-5 w-[2px] rounded-full bg-primary/50" aria-hidden />}
            <Link
              to={m.to}
              className={cn(
                "press relative flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl text-foreground",
                active && "text-primary glow-text",
              )}
            >
              <Icon className="size-7" strokeWidth={1.7} />
              <span className="text-lg font-bold leading-none">{t(m.label)}</span>
              <span
                className={cn(
                  "absolute bottom-1.5 h-[3px] rounded-full bg-primary transition-all duration-300",
                  active ? "w-10 opacity-100" : "w-0 opacity-0",
                )}
              />
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
