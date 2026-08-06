import { syncAllAccounts } from "../src/lib/instagram/sync";

async function main(): Promise<void> {
  const summaries = await syncAllAccounts();
  for (const s of summaries) {
    console.log(
      `${s.accountId}: ${s.postsUpserted} posts, ${s.metricsUpserted} metrics updated, ${s.insightErrors} insight errors`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
