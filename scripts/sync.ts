import { sync } from "../lib/instagram/sync";

async function main(): Promise<void> {
  const summary = await sync();
  console.log(
    `${summary.postsUpserted} posts, ${summary.metricsUpserted} metrics updated, ${summary.insightErrors} insight errors`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
