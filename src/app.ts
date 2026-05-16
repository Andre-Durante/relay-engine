import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { errorHandler } from "./common/error-handler.js";
import { deliveryEventsRoutes } from "./modules/delivery-events/delivery-events.routes.js";
import { driversRoutes } from "./modules/drivers/drivers.routes.js";
import { statisticsRoutes } from "./modules/statistics/statistics.routes.js";

export async function buildApp() {
  // `buildApp` keeps Fastify setup in one place so tests and the real server can
  // create the same application instance.
  const app = Fastify({
    logger: true
  });

  // All thrown errors flow through this handler, which keeps API error responses
  // consistent across modules.
  app.setErrorHandler(errorHandler);

  // Driver uploads arrive as multipart form-data. The actual CSV parsing happens
  // in the driver service after the uploaded file is read into a buffer.
  app.register(multipart, {
    limits: {
      // Driver CSVs should be small, but this leaves room for realistic test data.
      fileSize: 5 * 1024 * 1024
    }
  });

  app.get("/health", async () => ({ status: "ok" }));

  // Each feature owns its own routes/controllers/services/repositories.
  app.register(driversRoutes);
  app.register(deliveryEventsRoutes);
  app.register(statisticsRoutes);

  return app;
}
