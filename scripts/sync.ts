import { sync } from "../lib/instagram/sync";

async function main(): Promise<void> {
  const summary = await sync();
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
