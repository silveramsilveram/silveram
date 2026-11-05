import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { closeDatabase, connectDatabase } from './platform/appwrite.js';
import { startConfirmationRetrySweeper } from './mail/orderConfirmation.js';
import { startReservationSweeper } from './routes/orders.js';

const config = loadConfig();
await connectDatabase(config);

const app = createApp(config);
const server = app.listen(config.port, () => {
  console.log(`Silveram API listening on port ${config.port}`);
});

startReservationSweeper();
startConfirmationRetrySweeper(config);

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down Silveram API.`);
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
