import { getProfile } from "@/lib/db/profile";
import { getBoardsWithMembership } from "@/lib/db/boards";
import { getPostsForPicker } from "@/lib/db/dashboard";
import { BoardsPicker } from "../../components/BoardsPicker";

export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  try {
    return await renderBoards();
  } catch (err) {
    const error = err as Error;
    console.error("Boards render failed:", error);
    return (
      <main className="p-6">
        <p className="font-mono text-sm" style={{ color: "var(--warn)" }}>
          {error.name}: {error.message}
        </p>
      </main>
    );
  }
}

async function renderBoards() {
  const profile = await getProfile();
  const handle = profile?.handle;
  if (!handle) {
    return (
      <main className="p-6">
        <p style={{ color: "var(--muted)" }}>No account connected yet.</p>
      </main>
    );
  }

  const [boards, posts] = await Promise.all([getBoardsWithMembership(), getPostsForPicker(handle)]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
          Discover Boards
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Named collections of your posts.
        </p>
      </div>
      <BoardsPicker boards={boards} posts={posts} />
    </div>
  );
}
