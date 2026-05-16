import { Prisma, type PrismaClient } from "../../generated/prisma/client/client.js";
import { prisma } from "../../db/prisma.js";
import type { StatisticsQuery } from "./statistics.schema.js";

export type LatestStatusCounts = {
  totalPackages: number;
  deliveredPackages: number;
  failedPackages: number;
};

type CountsRow = {
  total_packages: bigint;
  delivered_packages: bigint;
  failed_packages: bigint;
};

export class StatisticsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async getLatestStatusCounts(query: StatisticsQuery): Promise<LatestStatusCounts> {
    // Start with the required date range. Optional filters are appended below
    // only when the caller provided them.
    const filters = [
      Prisma.sql`e.timestamp >= ${query.from}`,
      Prisma.sql`e.timestamp < ${query.to}`
    ];

    if (query.driverIds && query.driverIds.length > 0) {
      // Prisma.join safely parameterizes the variable-length IN list.
      filters.push(Prisma.sql`e.driver_id IN (${Prisma.join(query.driverIds)})`);
    }

    if (query.regions && query.regions.length > 0) {
      // PostgreSQL enums need to be cast to text when compared to string
      // parameters in this raw SQL query.
      filters.push(Prisma.sql`d.region::text IN (${Prisma.join(query.regions)})`);
    }

    // DISTINCT ON keeps exactly one event per package after filters are applied.
    // The ORDER BY picks the most recent event, with id as a stable tie-breaker.
    // We count delivered and failed packages from that latest-status set.
    const rows = await this.db.$queryRaw<CountsRow[]>`
      SELECT
        COUNT(*)::bigint AS total_packages,
        COUNT(*) FILTER (WHERE latest.status::text = 'delivered')::bigint AS delivered_packages,
        COUNT(*) FILTER (WHERE latest.status::text = 'failed')::bigint AS failed_packages
      FROM (
        SELECT DISTINCT ON (e.package_id)
          e.package_id,
          e.status,
          e.timestamp,
          e.id
        FROM delivery_events e
        INNER JOIN drivers d ON d.driver_id = e.driver_id
        WHERE ${Prisma.join(filters, " AND ")}
        ORDER BY e.package_id, e.timestamp DESC, e.id DESC
      ) latest
    `;

    const row = rows[0];

    // PostgreSQL COUNT returns bigint. Convert to normal numbers before the
    // service calculates rates and averages.
    return {
      totalPackages: Number(row?.total_packages ?? 0),
      deliveredPackages: Number(row?.delivered_packages ?? 0),
      failedPackages: Number(row?.failed_packages ?? 0)
    };
  }
}
