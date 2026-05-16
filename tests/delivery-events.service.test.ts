import { describe, expect, it, vi } from "vitest";
import { DeliveryEventsService } from "../src/modules/delivery-events/delivery-events.service.js";
import type { CreateDeliveryEventInput } from "../src/modules/delivery-events/delivery-events.schema.js";

const input: CreateDeliveryEventInput = {
  packageId: "PKG-1001",
  driverId: "1",
  status: "delivered",
  timestamp: new Date("2026-05-15T10:00:00.000Z")
};

describe("DeliveryEventsService", () => {
  it("records an event when the driver exists", async () => {
    const createdEvent = { id: "event-1", ...input };
    const deliveryEventsRepository = {
      create: vi.fn(async () => createdEvent)
    };
    const driversRepository = {
      exists: vi.fn(async () => true)
    };
    const service = new DeliveryEventsService(deliveryEventsRepository as never, driversRepository as never);

    await expect(service.record(input)).resolves.toEqual(createdEvent);
    expect(driversRepository.exists).toHaveBeenCalledWith("1");
    expect(deliveryEventsRepository.create).toHaveBeenCalledWith(input);
  });

  it("rejects an event when the driver does not exist", async () => {
    const deliveryEventsRepository = {
      create: vi.fn()
    };
    const driversRepository = {
      exists: vi.fn(async () => false)
    };
    const service = new DeliveryEventsService(deliveryEventsRepository as never, driversRepository as never);

    await expect(service.record(input)).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
      message: "Driver '1' does not exist"
    });
    expect(deliveryEventsRepository.create).not.toHaveBeenCalled();
  });
});
