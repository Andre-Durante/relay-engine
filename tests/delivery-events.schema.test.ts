import { describe, expect, it } from "vitest";
import { createDeliveryEventSchema } from "../src/modules/delivery-events/delivery-events.schema.js";

describe("createDeliveryEventSchema", () => {
  it("validates and coerces a delivery event timestamp", () => {
    const event = createDeliveryEventSchema.parse({
      packageId: "PKG-1001",
      driverId: "1",
      status: "delivered",
      timestamp: "2026-05-15T10:00:00.000Z"
    });

    expect(event.timestamp).toBeInstanceOf(Date);
    expect(event.timestamp.toISOString()).toBe("2026-05-15T10:00:00.000Z");
  });

  it("rejects unsupported statuses", () => {
    expect(() =>
      createDeliveryEventSchema.parse({
        packageId: "PKG-1001",
        driverId: "1",
        status: "lost",
        timestamp: "2026-05-15T10:00:00.000Z"
      })
    ).toThrow();
  });

  it("rejects missing package IDs and driver IDs", () => {
    expect(() =>
      createDeliveryEventSchema.parse({
        packageId: "",
        driverId: "",
        status: "delivered",
        timestamp: "2026-05-15T10:00:00.000Z"
      })
    ).toThrow();
  });

  it("rejects invalid timestamps", () => {
    expect(() =>
      createDeliveryEventSchema.parse({
        packageId: "PKG-1001",
        driverId: "1",
        status: "delivered",
        timestamp: "not-a-date"
      })
    ).toThrow();
  });
});
