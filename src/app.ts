import multipart, { ajvFilePlugin } from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import { errorHandler } from "./common/error-handler.js";
import { healthRouteSchema } from "./docs/openapi.js";
import { deliveryEventsRoutes } from "./modules/delivery-events/delivery-events.routes.js";
import { driversRoutes } from "./modules/drivers/drivers.routes.js";
import { statisticsRoutes } from "./modules/statistics/statistics.routes.js";

const multipartAjvPlugin = (ajv: Parameters<typeof ajvFilePlugin>[0]) => {
  ajvFilePlugin(ajv);
  return ajv;
};

export async function buildApp() {
  // `buildApp` keeps Fastify setup in one place so tests and the real server can
  // create the same application instance.
  const app = Fastify({
    logger: true,
    ajv: {
      // Multipart file fields use the non-standard `isFile` keyword. This plugin
      // lets Fastify validate file uploads and lets Swagger render them as file inputs.
      plugins: [multipartAjvPlugin]
    }
  });

  // All thrown errors flow through this handler, which keeps API error responses
  // consistent across modules.
  app.setErrorHandler(errorHandler);

  // Swagger must be registered before the routes it documents. The UI is exposed
  // at /docs, and the generated OpenAPI JSON is available at /docs/json.
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Relay Engine API",
        description: "REST API for driver uploads, delivery events, and delivery statistics.",
        version: "1.0.0"
      },
      tags: [
        { name: "Health", description: "Basic service health check." },
        { name: "Drivers", description: "Driver import endpoints." },
        { name: "Delivery Events", description: "Package delivery event endpoints." },
        { name: "Statistics", description: "Delivery statistics endpoints." }
      ]
    }
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true
    }
  });

  // Driver uploads arrive as multipart form-data. The actual CSV parsing happens
  // in the driver service after the uploaded file is read into a buffer.
  app.register(multipart, {
    attachFieldsToBody: true,
    limits: {
      // Driver CSVs should be small, but this leaves room for realistic test data.
      fileSize: 5 * 1024 * 1024
    }
  });

  app.get("/health", { schema: healthRouteSchema }, async () => ({ status: "ok" }));

  // Each feature owns its own routes/controllers/services/repositories.
  app.register(driversRoutes);
  app.register(deliveryEventsRoutes);
  app.register(statisticsRoutes);

  return app;
}
