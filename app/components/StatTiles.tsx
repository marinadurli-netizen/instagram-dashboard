import { Bookmark, Eye, Film, Gauge, Heart, Share2, Users2, type LucideIcon } from "lucide-react";
import type { AllTimeStats } from "@/lib/db/dashboard";
import { formatCount } from "./format";

const TILES: ReadonlyArray<{ key: keyof AllTimeStats; label: string; icon: LucideIcon }> = [
  { key: "posts", label: "Posts", icon: Film },
  { key: "views", label: "Views", icon: Eye },
  { key: "avgViews", label: "Avg Views", icon: Gauge },
  { key: "likes", label: "Likes", icon: Heart },
  { key: "saves", label: "Saves", icon: Bookmark },
  { key: "shares", label: "Shares", icon: Share2 },
  { key: "reach", label: "Reach", icon: Users2 },
];

export function StatTiles({ stats }: { stats: AllTimeStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {TILES.map(({ key, label, icon: Icon }) => (
        <div
          key={key}
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--border)", background: "var(--panel)" }}
        >
          <Icon size={16} style={{ color: "var(--faint)" }} />
          <div className="mt-2 text-xl font-semibold" style={{ color: "var(--text)" }}>
            {formatCount(stats[key])}
          </div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
