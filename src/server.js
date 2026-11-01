require('dotenv').config();

const app = require('./app');
const connectDatabase = require('./config/database');

const port = Number(process.env.PORT) || 5000;

async function start() {
  await connectDatabase(process.env.MONGODB_URI);
  const server = app.listen(port, () => console.log(`Inventory API listening on port ${port}`));

  const shutdown = async (signal) => {
    console.log(`${signal} received; shutting down`);
    server.close(async () => {
      const mongoose = require('mongoose');
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error(`Unable to start the API: ${error.message}`);
  process.exit(1);
});
