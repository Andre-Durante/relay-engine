import type { PrismaClient } from "../../generated/prisma/client/client.js";
import type { DriverInput } from "./drivers.schema.js";
import { prisma } from "../../db/prisma.js";

export class DriversRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async upsertMany(drivers: DriverInput[]): Promise<number> {
    // Import should be all-or-nothing. If any database write fails, the whole
    // transaction rolls back instead of leaving a partial driver import.
    await this.db.$transaction(
      drivers.map((driver) =>
        this.db.driver.upsert({
          where: { driverId: driver.driverId },
          create: driver,
          update: {
            name: driver.name,
            phoneNumber: driver.phoneNumber,
            email: driver.email,
            region: driver.region
          }
        })
      )
    );

    return drivers.length;
  }

  async exists(driverId: string): Promise<boolean> {
    // Only select the primary key because callers only need to know whether the
    // driver exists, not load the full driver record.
    const driver = await this.db.driver.findUnique({
      where: { driverId },
      select: { driverId: true }
    });

    return driver !== null;
  }
}
