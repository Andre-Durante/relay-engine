import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { buildApp } from "./app.js";

const app = await buildApp();

const shutdown = async () => {
  app.log.info("Shutting down Relay Engine");
  // Close the HTTP server and database connection so local runs and containers
  // stop cleanly when they receive Ctrl+C or a termination signal.
  await app.close();
  await prisma.$disconnect();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({
  port: env.PORT,
  // Bind to all interfaces so the app works both locally and inside Docker-like
  // environments where localhost may not be the caller's interface.
  host: "0.0.0.0"
});
