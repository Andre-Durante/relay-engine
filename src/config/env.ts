import "dotenv/config";
import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalizedValue = value.toLowerCase();

    if (normalizedValue === "true") {
      return true;
    }

    if (normalizedValue === "false") {
      return false;
    }
  }

  return value;
}, z.boolean());

// Environment validation fails fast at startup instead of letting missing values
// show up later as database or network errors.
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  KAFKA_ENABLED: booleanFromEnv.default(false),
  KAFKA_CLIENT_ID: z.string().trim().min(1).default("relay-engine"),
  KAFKA_BROKERS: z
    .string()
    .trim()
    .min(1)
    .default("localhost:9092")
    .transform((value) =>
      value
        .split(",")
        .map((broker) => broker.trim())
        .filter(Boolean)
    ),
  KAFKA_DELIVERY_EVENTS_TOPIC: z.string().trim().min(1).default("delivery-events")
});

export type AppEnv = z.infer<typeof envSchema>;

// Export one parsed config object so the rest of the app does not read
// `process.env` directly.
export const env: AppEnv = envSchema.parse(process.env);
