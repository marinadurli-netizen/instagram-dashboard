import { AlertTriangle, Lightbulb, Trophy } from "lucide-react";
import type { InsightCard } from "@/lib/db/dashboard";

// insights.kind drives styling: 'win' | 'warning' | 'idea'. Color alone
// never carries the meaning — every card also gets an icon and a text
// label, since green/warning-amber sit close enough for red-green color
// blindness that hue by itself isn't a safe signal (validated with the
// dataviz skill's palette checker).
const KIND_STYLES = {
  win: { icon: Trophy, color: "var(--accent)", bg: "var(--accent-soft)", label: "Win" },
  warning: { icon: AlertTriangle, color: "var(--warn)", bg: "var(--warn-soft)", label: "Warning" },
  idea: { icon: Lightbulb, color: "var(--idea)", bg: "var(--idea-soft)", label: "Idea" },
} as const;

export function InsightCards({ insights }: { insights: InsightCard[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {insights.map((insight) => {
        const style = KIND_STYLES[insight.kind as keyof typeof KIND_STYLES] ?? KIND_STYLES.idea;
        const Icon = style.icon;
        return (
          <div
            key={insight.id}
            className="rounded-xl border-l-4 p-4"
            style={{ borderColor: style.color, background: style.bg }}
          >
            <div
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: style.color }}
            >
              <Icon size={14} />
              {style.label}
            </div>
            <p className="mt-2 text-sm" style={{ color: "var(--text)" }}>
              {insight.content}
            </p>
          </div>
        );
      })}
    </div>
  );
}
