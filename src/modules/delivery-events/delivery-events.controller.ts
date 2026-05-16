import type { FastifyReply, FastifyRequest } from "fastify";
import { createDeliveryEventSchema } from "./delivery-events.schema.js";
import { DeliveryEventsService } from "./delivery-events.service.js";

export class DeliveryEventsController {
  constructor(private readonly deliveryEventsService = new DeliveryEventsService()) {}

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    // Controllers validate request shape before calling services. Invalid bodies
    // throw a ZodError handled by the global error handler.
    const input = createDeliveryEventSchema.parse(request.body);
    const event = await this.deliveryEventsService.record(input);

    return reply.status(201).send(event);
  };
}
