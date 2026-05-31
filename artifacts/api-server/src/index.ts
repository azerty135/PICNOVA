import app from "./app";
import { logger } from "./lib/logger";
import cron from "node-cron";
import { processDailyGains } from "./jobs/dailyGains";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Run daily gains every day at midnight (00:00)
  cron.schedule("0 0 * * *", async () => {
    logger.info("Cron: running daily gains job");
    try {
      const result = await processDailyGains();
      logger.info(result, "Cron: daily gains complete");
    } catch (err) {
      logger.error({ err }, "Cron: daily gains job failed");
    }
  });

  logger.info("Daily gains cron job scheduled (runs at 00:00 every day)");
});
