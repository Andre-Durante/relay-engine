import { describe, expect, it } from "vitest";
import type { StatisticsRepository } from "../src/modules/statistics/statistics.repository.js";
import { StatisticsService } from "../src/modules/statistics/statistics.service.js";
import type { StatisticsQuery } from "../src/modules/statistics/statistics.schema.js";

function baseQuery(metric: StatisticsQuery["metric"]): StatisticsQuery {
  return {
    metric,
    from: new Date("2026-05-01T00:00:00.000Z"),
    to: new Date("2026-05-08T00:00:00.000Z"),
    days: 7
  };
}

describe("StatisticsService", () => {
  it("calculates delivery rate from latest package status counts", async () => {
    const repository = {
      getLatestStatusCounts: async () => ({
        totalPackages: 8,
        deliveredPackages: 6,
        failedPackages: 1
      })
    } as Pick<StatisticsRepository, "getLatestStatusCounts"> as StatisticsRepository;

    const service = new StatisticsService(repository);
    const result = await service.calculate(baseQuery("delivery_rate"));

    expect(result.value).toBe(0.75);
    expect(result.counts.totalPackages).toBe(8);
  });

  it("calculates total packages", async () => {
    const repository = {
      getLatestStatusCounts: async () => ({
        totalPackages: 12,
        deliveredPackages: 7,
        failedPackages: 2
      })
    } as Pick<StatisticsRepository, "getLatestStatusCounts"> as StatisticsRepository;

    const service = new StatisticsService(repository);
    const result = await service.calculate(baseQuery("total_packages"));

    expect(result.value).toBe(12);
  });

  it("returns zero rates when there are no matching packages", async () => {
    const repository = {
      getLatestStatusCounts: async () => ({
        totalPackages: 0,
        deliveredPackages: 0,
        failedPackages: 0
      })
    } as Pick<StatisticsRepository, "getLatestStatusCounts"> as StatisticsRepository;

    const service = new StatisticsService(repository);
    const result = await service.calculate(baseQuery("failure_rate"));

    expect(result.value).toBe(0);
  });

  it("calculates average deliveries per day", async () => {
    const repository = {
      getLatestStatusCounts: async () => ({
        totalPackages: 12,
        deliveredPackages: 7,
        failedPackages: 2
      })
    } as Pick<StatisticsRepository, "getLatestStatusCounts"> as StatisticsRepository;

    const service = new StatisticsService(repository);
    const result = await service.calculate(baseQuery("average_deliveries_per_day"));

    expect(result.value).toBe(1);
  });

  it("returns the applied filters in the response", async () => {
    const repository = {
      getLatestStatusCounts: async () => ({
        totalPackages: 2,
        deliveredPackages: 1,
        failedPackages: 1
      })
    } as Pick<StatisticsRepository, "getLatestStatusCounts"> as StatisticsRepository;

    const service = new StatisticsService(repository);
    const result = await service.calculate({
      ...baseQuery("failure_rate"),
      driverIds: ["1", "2"],
      regions: ["north", "south"]
    });

    expect(result.filters).toEqual({
      driverIds: ["1", "2"],
      regions: ["north", "south"]
    });
    expect(result.value).toBe(0.5);
  });
});
