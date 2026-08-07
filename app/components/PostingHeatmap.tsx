"use client";

import { useEffect, useRef } from "react";
import type { HeatmapData } from "@/lib/db/dashboard";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function PostingHeatmap({ data }: { data: HeatmapData }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Anchor the horizontal scroll to the most recent weeks (right edge) —
  // 12 months of daily cells doesn't fit on screen, and the newest weeks
  // are what you actually want to see first.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const maxCount = Math.max(1, ...data.weeks.flat().map((d) => d.count));

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
    >
      <div ref={scrollRef} className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1">
          <div className="flex pl-9">
            {data.weeks.map((_, weekIndex) => {
              const label = data.monthLabels.find((m) => m.weekIndex === weekIndex)?.label;
              return (
                <div key={weekIndex} className="w-8 shrink-0 text-[10px]" style={{ color: "var(--faint)" }}>
                  {label ?? ""}
                </div>
              );
            })}
          </div>

          {WEEKDAY_LABELS.map((weekdayLabel, weekday) => (
            <div key={weekdayLabel} className="flex items-center">
              <div
                className="sticky left-0 z-10 w-9 shrink-0 text-[10px]"
                style={{ color: "var(--faint)", background: "var(--panel)" }}
              >
                {weekdayLabel}
              </div>
              {data.weeks.map((week, weekIndex) => {
                const day = week[weekday]!;
                if (!day.date) {
                  return <div key={weekIndex} className="h-7 w-8 shrink-0" />;
                }
                const intensity = day.count > 0 ? 0.25 + 0.75 * Math.min(1, day.count / maxCount) : 0;
                return (
                  <div
                    key={weekIndex}
                    title={`${day.date}: ${day.count} post${day.count === 1 ? "" : "s"}`}
                    className="flex h-7 w-8 shrink-0 items-center justify-center rounded text-[10px] font-medium"
                    style={{
                      background:
                        day.count > 0
                          ? `color-mix(in srgb, var(--accent) ${intensity * 100}%, var(--panel-2))`
                          : "var(--panel-2)",
                      color: day.count > 0 ? "var(--text)" : "var(--faint)",
                    }}
                  >
                    {day.count}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
