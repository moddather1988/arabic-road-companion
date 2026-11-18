import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function ScreenShell({
  title,
  icon: Icon,
  note,
  children,
}: {
  title: string;
  icon: LucideIcon;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="glass-strong flex h-full flex-col rounded-3xl px-6 py-4 animate-screen-in">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon className="size-5" />
          </span>
          <h1 className="text-2xl font-extrabold">{title}</h1>
        </div>
        {note && <p className="max-w-[55%] text-end text-xs text-muted-foreground">{note}</p>}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
