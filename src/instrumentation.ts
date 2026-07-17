export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const cron = (await import("node-cron")).default;
  const { runDailyJobs } = await import("./lib/jobs");

  // Catch up on boot (interest/allowances missed while the server slept)...
  runDailyJobs().catch((err) => console.error("boot jobs failed:", err));
  // ...then every day at 06:10 server time.
  cron.schedule("10 6 * * *", () => {
    runDailyJobs().catch((err) => console.error("daily jobs failed:", err));
  });
}
