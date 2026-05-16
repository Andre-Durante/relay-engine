import { notFound } from "../../common/errors.js";
import { DriversRepository } from "../drivers/drivers.repository.js";
import type { CreateDeliveryEventInput } from "./delivery-events.schema.js";
import { DeliveryEventsRepository } from "./delivery-events.repository.js";

export class DeliveryEventsService {
  constructor(
    private readonly deliveryEventsRepository = new DeliveryEventsRepository(),
    private readonly driversRepository = new DriversRepository()
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
    return this.deliveryEventsRepository.create(input);
  }
}
