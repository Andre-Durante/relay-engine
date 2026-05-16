import { notFound } from "../../common/errors.js";
import { DriversRepository } from "../drivers/drivers.repository.js";
import { deliveryEventPublisher, type DeliveryEventPublisher } from "./delivery-events.publisher.js";
import type { CreateDeliveryEventInput } from "./delivery-events.schema.js";
import { DeliveryEventsRepository } from "./delivery-events.repository.js";

export class DeliveryEventsService {
  constructor(
    private readonly deliveryEventsRepository = new DeliveryEventsRepository(),
    private readonly driversRepository = new DriversRepository(),
    private readonly publisher: DeliveryEventPublisher = deliveryEventPublisher
  ) {}

  async record(input: CreateDeliveryEventInput) {
    // Delivery events must reference a known driver from the uploaded driver data.
    // This makes bad driver IDs fail with a clear 404 before the database foreign
    // key would reject the insert.
    const driverExists = await this.driversRepository.exists(input.driverId);

    if (!driverExists) {
      throw notFound(`Driver '${input.driverId}' does not exist`);
    }

    // Once validation passes, persistence is delegated to the repository.
    const event = await this.deliveryEventsRepository.create(input);

    // Kafka publishing is intentionally best-effort in this optional branch. The
    // database remains the source of truth, so a Kafka outage should not make the
    // API fail after the event was already saved.
    await this.publishBestEffort(event);

    return event;
  }

  private async publishBestEffort(event: Awaited<ReturnType<DeliveryEventsRepository["create"]>>) {
    try {
      await this.publisher.publish(event);
    } catch (error) {
      console.warn("Delivery event saved, but Kafka publish failed", {
        eventId: event.id,
        error: error instanceof Error ? error.message : error
      });
    }
  }
}
