import { Music2 } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function AlbumArt({ hue, className, iconClass }: { hue: number; className?: string; iconClass?: string }) {
  return (
    <div
      className={cn("album-art flex shrink-0 items-center justify-center rounded-xl", className)}
      style={{ "--art-hue": hue } as CSSProperties}
    >
      <Music2 className={cn("size-5 opacity-90", iconClass)} />
    </div>
  );
}
