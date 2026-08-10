"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { createBoardAction, togglePostInBoardAction } from "../actions/boards";
import type { BoardWithPosts } from "@/lib/db/boards";
import type { PickerPost } from "@/lib/db/dashboard";

export function BoardsPicker({ boards, posts }: { boards: BoardWithPosts[]; posts: PickerPost[] }) {
  const router = useRouter();
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(boards[0]?.id ?? null);
  const [newBoardName, setNewBoardName] = useState("");
  const [pending, startTransition] = useTransition();

  const selectedBoard = boards.find((b) => b.id === selectedBoardId) ?? null;

  function createBoard() {
    const trimmed = newBoardName.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await createBoardAction(trimmed);
      setNewBoardName("");
      router.refresh();
    });
  }

  function toggle(postId: number) {
    if (selectedBoardId === null) return;
    startTransition(async () => {
      await togglePostInBoardAction(selectedBoardId, postId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {boards.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setSelectedBoardId(b.id)}
            className="rounded-full px-3 py-1.5 text-sm"
            style={{
              background: b.id === selectedBoardId ? "var(--idea)" : "var(--panel-2)",
              color: b.id === selectedBoardId ? "#fff" : "var(--muted)",
            }}
          >
            {b.name} <span style={{ opacity: 0.7 }}>({b.postIds.length})</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={newBoardName}
          onChange={(e) => setNewBoardName(e.target.value)}
          placeholder="New board name"
          className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--border)", background: "var(--panel-2)", color: "var(--text)" }}
          onKeyDown={(e) => {
            if (e.key === "Enter") createBoard();
          }}
        />
        <button
          type="button"
          onClick={createBoard}
          disabled={pending || !newBoardName.trim()}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium"
          style={{ background: "var(--accent)", color: "#fff", opacity: pending || !newBoardName.trim() ? 0.6 : 1 }}
        >
          <Plus size={14} />
          Board
        </button>
      </div>

      {selectedBoard ? (
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Tap posts to add or remove from &quot;{selectedBoard.name}&quot;
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
            {posts.map((post) => {
              const inBoard = selectedBoard.postIds.includes(post.id);
              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => toggle(post.id)}
                  disabled={pending}
                  className="relative aspect-square overflow-hidden rounded-lg border"
                  style={{ borderColor: inBoard ? "var(--accent)" : "var(--border)", opacity: pending ? 0.7 : 1 }}
                >
                  {post.thumb_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable CDN host
                    <img src={post.thumb_url} alt="" className="h-full w-full object-cover" />
                  )}
                  {inBoard && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "rgba(21,128,61,0.35)" }}
                    >
                      <Check size={20} color="#fff" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Create a board to start collecting posts.
        </p>
      )}
    </div>
  );
}
