import "dotenv/config";
import { z } from "zod";

// Environment validation fails fast at startup instead of letting missing values
// show up later as database or network errors.
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

export type AppEnv = z.infer<typeof envSchema>;

// Export one parsed config object so the rest of the app does not read
// `process.env` directly.
export const env: AppEnv = envSchema.parse(process.env);
