import postgres from "postgres";

const apply = process.argv.includes("--apply");
const connectionString = process.env.NUXT_DATABASE_URL;
if (!connectionString) throw new Error("NUXT_DATABASE_URL is required");
const client = postgres(connectionString, { prepare: false, max: 1 });
try {
  const [row] = await client`
    SELECT count(*)::int AS count
      FROM commerce_webhook_events
     WHERE status = 'failed'
        OR (status = 'processing' AND locked_at < now() - interval '5 minutes')
  `;
  process.stdout.write(`${apply ? "APPLY" : "DRY-RUN"}: ${row.count} failed/stale Stripe events are eligible.\n`);
  if (apply) {
    const reset = await client`
      UPDATE commerce_webhook_events
         SET status = 'received', next_attempt_at = now(), locked_at = NULL, lock_token = NULL, updated_at = now()
       WHERE status = 'failed'
          OR (status = 'processing' AND locked_at < now() - interval '5 minutes')
      RETURNING stripe_event_id
    `;
    process.stdout.write(`Reset ${reset.length} events; the application worker remains the only entitlement writer.\n`);
  }
} finally {
  await client.end();
}
