import { sync } from "../lib/instagram/sync";

async function main(): Promise<void> {
  const summary = await sync();
  if (summary.skipped) {
    console.log("Skipped — a sync already completed inside the guard window.");
    return;
  }
  console.log(
    `${summary.postsUpserted} posts, ${summary.metricsUpserted} with metrics, ` +
      `${summary.backfillAttempted} watch-time backfilled (${summary.backfillErrors} errors), ` +
      `profile synced=${summary.profileSynced}, token refreshed=${summary.tokenRefreshed}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
