import { z } from "zod";
import { REGIONS } from "../../common/domain.js";

// This schema represents one normalized driver row after CSV headers have been
// mapped to the API's internal field names.
export const driverInputSchema = z.object({
  driverId: z.string().trim().min(1, "driver_id is required"),
  name: z.string().trim().min(1, "name is required"),
  phoneNumber: z.string().trim().min(1, "phone_number is required"),
  email: z.string().trim().email("email must be valid"),
  region: z.enum(REGIONS)
});

export type DriverInput = z.infer<typeof driverInputSchema>;
