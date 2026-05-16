import { describe, expect, it, vi } from "vitest";
import { KafkaDeliveryEventPublisher } from "../src/modules/delivery-events/delivery-events.publisher.js";

const event = {
  id: "event-1",
  packageId: "PKG-1001",
  driverId: "1",
  status: "delivered",
  timestamp: new Date("2026-05-15T10:00:00.000Z"),
  createdAt: new Date("2026-05-16T08:30:00.000Z")
};

describe("KafkaDeliveryEventPublisher", () => {
  function createPublisher() {
    const producer = {
      connect: vi.fn(async () => undefined),
      send: vi.fn(async () => undefined),
      disconnect: vi.fn(async () => undefined)
    };

    const publisher = new KafkaDeliveryEventPublisher(
      {
        clientId: "relay-engine-test",
        brokers: ["localhost:9092"],
        topic: "delivery-events-test"
      },
      () => producer as never
    );

    return { producer, publisher };
  }

  it("publishes delivery events using the expected topic, key, and JSON payload", async () => {
    const { producer, publisher } = createPublisher();

    await publisher.publish(event);

    expect(producer.connect).toHaveBeenCalledOnce();
    expect(producer.send).toHaveBeenCalledWith({
      topic: "delivery-events-test",
      messages: [
        {
          key: "PKG-1001",
          value: JSON.stringify({
            eventId: "event-1",
            packageId: "PKG-1001",
            driverId: "1",
            status: "delivered",
            timestamp: "2026-05-15T10:00:00.000Z",
            createdAt: "2026-05-16T08:30:00.000Z"
          })
        }
      ]
    });
  });

  it("reuses the producer connection and disconnects cleanly", async () => {
    const { producer, publisher } = createPublisher();

    await publisher.publish(event);
    await publisher.publish({ ...event, id: "event-2", status: "failed" });
    await publisher.disconnect();

    expect(producer.connect).toHaveBeenCalledOnce();
    expect(producer.send).toHaveBeenCalledTimes(2);
    expect(producer.disconnect).toHaveBeenCalledOnce();
  });
});
