import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { RecentAverages } from "@/lib/db/dashboard";
import { formatCount } from "./format";

const METRICS: ReadonlyArray<{ key: keyof RecentAverages; label: string }> = [
  { key: "views", label: "Avg Views" },
  { key: "likes", label: "Avg Likes" },
  { key: "saves", label: "Avg Saves" },
  { key: "shares", label: "Avg Shares" },
];

export function AveragesRow({ averages }: { averages: RecentAverages }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {METRICS.map(({ key, label }) => {
        const { last30, changePct } = averages[key];
        return (
          <div
            key={key}
            className="rounded-xl border p-4"
            style={{ borderColor: "var(--border)", background: "var(--panel)" }}
          >
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              {label} · last 30d
            </div>
            <div className="mt-1 text-xl font-semibold" style={{ color: "var(--text)" }}>
              {last30 != null ? formatCount(last30) : "—"}
            </div>
            <ChangeBadge changePct={changePct} />
          </div>
        );
      })}
    </div>
  );
}

function ChangeBadge({ changePct }: { changePct: number | null }) {
  if (changePct === null) {
    return (
      <div className="mt-1 flex items-center gap-1 text-xs" style={{ color: "var(--faint)" }}>
        <Minus size={12} />
        no prior data
      </div>
    );
  }
  const up = changePct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <div
      className="mt-1 flex items-center gap-1 text-xs font-medium"
      style={{ color: up ? "var(--accent)" : "var(--warn)" }}
    >
      <Icon size={12} />
      {up ? "+" : ""}
      {changePct.toFixed(0)}% vs prior 30d
    </div>
  );
}
