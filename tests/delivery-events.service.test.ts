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
  function createPublisherMock() {
    return {
      publish: vi.fn(async () => undefined),
      disconnect: vi.fn(async () => undefined)
    };
  }

  it("records an event when the driver exists", async () => {
    const createdEvent = { id: "event-1", createdAt: new Date("2026-05-15T10:00:01.000Z"), ...input };
    const deliveryEventsRepository = {
      create: vi.fn(async () => createdEvent)
    };
    const driversRepository = {
      exists: vi.fn(async () => true)
    };
    const publisher = createPublisherMock();
    const service = new DeliveryEventsService(
      deliveryEventsRepository as never,
      driversRepository as never,
      publisher
    );

    await expect(service.record(input)).resolves.toEqual(createdEvent);
    expect(driversRepository.exists).toHaveBeenCalledWith("1");
    expect(deliveryEventsRepository.create).toHaveBeenCalledWith(input);
    expect(publisher.publish).toHaveBeenCalledWith(createdEvent);
  });

  it("rejects an event when the driver does not exist", async () => {
    const deliveryEventsRepository = {
      create: vi.fn()
    };
    const driversRepository = {
      exists: vi.fn(async () => false)
    };
    const publisher = createPublisherMock();
    const service = new DeliveryEventsService(
      deliveryEventsRepository as never,
      driversRepository as never,
      publisher
    );

    await expect(service.record(input)).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
      message: "Driver '1' does not exist"
    });
    expect(deliveryEventsRepository.create).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it("still returns the saved event when optional Kafka publishing fails", async () => {
    const createdEvent = { id: "event-1", createdAt: new Date("2026-05-15T10:00:01.000Z"), ...input };
    const deliveryEventsRepository = {
      create: vi.fn(async () => createdEvent)
    };
    const driversRepository = {
      exists: vi.fn(async () => true)
    };
    const publisher = {
      publish: vi.fn(async () => {
        throw new Error("Kafka is unavailable");
      }),
      disconnect: vi.fn(async () => undefined)
    };
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const service = new DeliveryEventsService(
      deliveryEventsRepository as never,
      driversRepository as never,
      publisher
    );

    await expect(service.record(input)).resolves.toEqual(createdEvent);
    expect(publisher.publish).toHaveBeenCalledWith(createdEvent);
    expect(warnSpy).toHaveBeenCalledWith(
      "Delivery event saved, but Kafka publish failed",
      expect.objectContaining({ eventId: "event-1", error: "Kafka is unavailable" })
    );

    warnSpy.mockRestore();
  });
});
