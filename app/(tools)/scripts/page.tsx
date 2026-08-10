import { getProfile } from "@/lib/db/profile";
import { getPostForModel } from "@/lib/db/posts";
import { ScriptWriter } from "../../components/ScriptWriter";

export const dynamic = "force-dynamic";

export default async function ScriptsPage({
  searchParams,
}: {
  searchParams: Promise<{ modelPostId?: string }>;
}) {
  try {
    return await renderScripts(await searchParams);
  } catch (err) {
    const error = err as Error;
    console.error("Script Writer render failed:", error);
    return (
      <main className="p-6">
        <p className="font-mono text-sm" style={{ color: "var(--warn)" }}>
          {error.name}: {error.message}
        </p>
      </main>
    );
  }
}

async function renderScripts({ modelPostId: modelPostIdParam }: { modelPostId?: string }) {
  const profile = await getProfile();
  const handle = profile?.handle;

  const modelPostId = modelPostIdParam ? Number(modelPostIdParam) : undefined;
  let modelPostCaption: string | null = null;
  if (modelPostId !== undefined && Number.isInteger(modelPostId) && handle) {
    const modelPost = await getPostForModel(modelPostId, handle);
    modelPostCaption = modelPost?.caption ?? null;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
          Script Writer
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Give it a topic, get a hook, script, caption and filming notes.
        </p>
      </div>

      <ScriptWriter
        modelPostId={modelPostId !== undefined && Number.isInteger(modelPostId) ? modelPostId : undefined}
        modelPostCaption={modelPostCaption}
      />
    </div>
  );
}
