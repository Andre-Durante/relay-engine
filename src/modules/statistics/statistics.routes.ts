import type { FastifyInstance } from "fastify";
import { StatisticsController } from "./statistics.controller.js";

export async function statisticsRoutes(app: FastifyInstance) {
  const controller = new StatisticsController();

  // Query endpoint for aggregate metrics like delivery rate and failure rate.
  app.get("/delivery-statistics", controller.getStatistics);
}
