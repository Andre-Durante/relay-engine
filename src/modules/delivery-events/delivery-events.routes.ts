import type { FastifyInstance } from "fastify";
import { createDeliveryEventRouteSchema } from "../../docs/openapi.js";
import { DeliveryEventsController } from "./delivery-events.controller.js";

export async function deliveryEventsRoutes(app: FastifyInstance) {
  const controller = new DeliveryEventsController();

  // Records one status change for a package handled by an existing driver.
  app.post("/delivery-events", { schema: createDeliveryEventRouteSchema }, controller.create);
}
