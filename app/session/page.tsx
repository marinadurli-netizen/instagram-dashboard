import { getQueuedScripts } from "@/lib/db/scripts";
import { Teleprompter } from "./Teleprompter";

// Full-screen teleprompter — deliberately outside the (tools) route group
// so it renders without the AppShell sidebar/nav chrome.
export const dynamic = "force-dynamic";

export default async function SessionPage() {
  const scripts = await getQueuedScripts();
  return <Teleprompter scripts={scripts} />;
}
