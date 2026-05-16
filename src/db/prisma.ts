import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.js";
import { PrismaClient } from "../generated/prisma/client/client.js";

// Prisma 7 uses a driver adapter for database connections. Here the adapter
// wraps the PostgreSQL connection string from the validated environment config.
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL
});

// One shared Prisma Client is used across repositories. In development we keep
// warning/error logs visible without logging every query.
export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
});
