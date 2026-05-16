import { z } from "zod";
import { DELIVERY_STATUSES } from "../../common/domain.js";

// Request validation for creating one delivery event. The timestamp accepts a
// string from JSON and is coerced into a Date for the service/repository layer.
export const createDeliveryEventSchema = z.object({
  packageId: z.string().trim().min(1, "packageId is required"),
  driverId: z.string().trim().min(1, "driverId is required"),
  status: z.enum(DELIVERY_STATUSES),
  timestamp: z.coerce.date()
});

export type CreateDeliveryEventInput = z.infer<typeof createDeliveryEventSchema>;
