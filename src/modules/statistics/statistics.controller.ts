import type { FastifyReply, FastifyRequest } from "fastify";
import { parseStatisticsQuery } from "./statistics.schema.js";
import { StatisticsService } from "./statistics.service.js";

export class StatisticsController {
  constructor(private readonly statisticsService = new StatisticsService()) {}

  getStatistics = async (request: FastifyRequest, reply: FastifyReply) => {
    // Query parsing turns raw URL parameters into the normalized StatisticsQuery
    // object used by the service and repository.
    const query = parseStatisticsQuery(request.query);
    const result = await this.statisticsService.calculate(query);

    return reply.send(result);
  };
}
