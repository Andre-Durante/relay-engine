import type { PrismaClient } from "../../generated/prisma/client/client.js";
import { prisma } from "../../db/prisma.js";
import type { CreateDeliveryEventInput } from "./delivery-events.schema.js";

export class DeliveryEventsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async create(input: CreateDeliveryEventInput) {
    // Select only API-facing fields so callers do not depend on the full database
    // model shape.
    return this.db.deliveryEvent.create({
      data: input,
      select: {
        id: true,
        packageId: true,
        driverId: true,
        status: true,
        timestamp: true,
        createdAt: true
      }
    });
  }
}
