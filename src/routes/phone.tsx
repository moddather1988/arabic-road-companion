import { createFileRoute } from "@tanstack/react-router";
import { Delete, Phone, PhoneCall } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ScreenShell } from "@/components/launcher/ScreenShell";
import { useT } from "@/lib/cockpit/i18n";

export const Route = createFileRoute("/phone")({
  head: () => ({
    meta: [
      { title: "الهاتف — جاردينيا سمارت كار" },
      { name: "description", content: "لوحة الاتصال في واجهة السيارة." },
      { property: "og:title", content: "الهاتف — جاردينيا سمارت كار" },
      { property: "og:description", content: "اتصال عبر هاتف مقترن بالبلوتوث." },
    ],
  }),
  component: PhoneScreen,
});

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

function PhoneScreen() {
  const { t } = useT();
  const [num, setNum] = useState("");
  return (
    <ScreenShell title={t("phone")} icon={Phone} note={t("phoneNote")}>
      <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-3">
        <div className="flex h-12 w-full items-center justify-center gap-3">
          <span dir="ltr" className="font-display text-4xl font-bold tracking-widest tnum">
            {num || "—"}
          </span>
          {num && (
            <button className="press text-muted-foreground hover:text-primary" onClick={() => setNum((n) => n.slice(0, -1))} aria-label="delete">
              <Delete className="size-6" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2" dir="ltr">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setNum((n) => (n.length < 15 ? n + k : n))}
              className="press glass flex h-12 w-24 items-center justify-center rounded-xl font-display text-2xl font-bold hover:glow-ring"
            >
              {k}
            </button>
          ))}
        </div>
        <button
          onClick={() => toast(t("noPhone"))}
          className="press mt-1 flex items-center gap-2 rounded-full bg-success px-8 py-2.5 font-bold text-primary-foreground"
        >
          <PhoneCall className="size-5" />
          {t("dial")}
        </button>
      </div>
    </ScreenShell>
  );
}
