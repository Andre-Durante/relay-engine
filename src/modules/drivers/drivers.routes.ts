import type { FastifyInstance } from "fastify";
import { DriversController } from "./drivers.controller.js";

export async function driversRoutes(app: FastifyInstance) {
  const controller = new DriversController();

  // File upload endpoint for creating/updating drivers from CSV-like files.
  app.post("/drivers/upload", controller.uploadDrivers);
}
