const { getConfig } = require("./config/env");
const { connectDb } = require("./config/db");
const { logger } = require("./utils/logger");
const { buildApp } = require("./app");

async function main() {
  const config = getConfig();
  await connectDb(config.mongoUri);

  const app = buildApp(config);

  app.listen(config.port, () => {
    logger.info({ port: config.port }, "server_started");
  });
}

main().catch((err) => {
  logger.error({ err }, "fatal_startup_error");
  process.exit(1);
});
