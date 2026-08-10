"use client";

import { EditableText } from "./EditableText";
import { SyncButton } from "./SyncButton";
import { formatCount, formatRelativeTime } from "./format";
import { saveProfileField } from "../actions/profile";

interface ProfileHeaderProps {
  displayName: string | null;
  handle: string | null;
  bio: string | null;
  followers: number | null;
  totalLikes: number;
  totalPosts: number;
  lastSyncedAt: string | null;
}

async function saveFollowers(value: string): Promise<void> {
  const trimmed = value.trim();
  if (trimmed === "") {
    await saveProfileField({ followers: null });
    return;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return; // leave stored value alone on garbage input
  await saveProfileField({ followers: Math.round(n) });
}

export function ProfileHeader({
  displayName,
  handle,
  bio,
  followers,
  totalLikes,
  totalPosts,
  lastSyncedAt,
}: ProfileHeaderProps) {
  const initials =
    (displayName || handle || "?")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?";

  return (
    <section
      className="rounded-2xl border p-6"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
    >
      <div className="flex items-center justify-end gap-2">
        {lastSyncedAt && (
          <span className="text-xs" style={{ color: "var(--faint)" }}>
            Synced {formatRelativeTime(lastSyncedAt)}
          </span>
        )}
        <SyncButton lastSyncedAt={lastSyncedAt} />
      </div>

      <div className="mt-4 flex items-start gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold"
          style={{ background: "var(--panel-2)", color: "var(--text)" }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <EditableText
            value={displayName ?? ""}
            placeholder="Your name"
            className="text-lg font-semibold"
            style={{ color: "var(--text)" }}
            onSave={(value) => saveProfileField({ display_name: value })}
          />
          <div className="mt-0.5 flex items-center gap-0.5 text-sm" style={{ color: "var(--muted)" }}>
            <span>@</span>
            <EditableText
              value={handle ?? ""}
              placeholder="handle"
              className="text-sm"
              style={{ color: "var(--muted)" }}
              onSave={(value) => saveProfileField({ handle: value })}
            />
          </div>
          <EditableText
            value={bio ?? ""}
            placeholder="Add a bio…"
            multiline
            className="mt-2 text-sm"
            style={{ color: "var(--muted)" }}
            onSave={(value) => saveProfileField({ bio: value })}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
        <div>
          <EditableText
            value={followers != null ? String(followers) : ""}
            placeholder="0"
            className="text-base font-semibold"
            style={{ color: "var(--text)" }}
            onSave={saveFollowers}
          />
          <div className="text-xs" style={{ color: "var(--faint)" }}>
            Followers
          </div>
        </div>
        <div>
          <div className="text-base font-semibold" style={{ color: "var(--text)" }}>
            {formatCount(totalLikes)}
          </div>
          <div className="text-xs" style={{ color: "var(--faint)" }}>
            Likes
          </div>
        </div>
        <div>
          <div className="text-base font-semibold" style={{ color: "var(--text)" }}>
            {totalPosts}
          </div>
          <div className="text-xs" style={{ color: "var(--faint)" }}>
            Posts
          </div>
        </div>
      </div>
    </section>
  );
}
