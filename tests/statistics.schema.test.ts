import { describe, expect, it } from "vitest";
import { AppError } from "../src/common/errors.js";
import { parseStatisticsQuery } from "../src/modules/statistics/statistics.schema.js";

describe("parseStatisticsQuery", () => {
  it("defaults to the current UTC day when no date range is provided", () => {
    const query = parseStatisticsQuery(
      { metric: "total_packages" },
      new Date("2026-05-15T12:30:00.000Z")
    );

    expect(query.from.toISOString()).toBe("2026-05-15T00:00:00.000Z");
    expect(query.to.toISOString()).toBe("2026-05-16T00:00:00.000Z");
    expect(query.days).toBe(1);
  });

  it("parses comma-separated driver and region filters", () => {
    const query = parseStatisticsQuery({
      metric: "delivery_rate",
      driverIds: "7, 8",
      regions: "north,EAST",
      from: "2026-05-01",
      to: "2026-05-07"
    });

    expect(query.driverIds).toEqual(["7", "8"]);
    expect(query.regions).toEqual(["north", "east"]);
    expect(query.days).toBe(7);
  });

  it("rejects ranges longer than one month", () => {
    expect(() =>
      parseStatisticsQuery({
        metric: "failure_rate",
        from: "2026-05-01",
        to: "2026-06-15"
      })
    ).toThrow(AppError);
  });

  it("rejects partial date ranges", () => {
    expect(() =>
      parseStatisticsQuery({
        metric: "total_packages",
        from: "2026-05-01"
      })
    ).toThrow(AppError);

    expect(() =>
      parseStatisticsQuery({
        metric: "total_packages",
        to: "2026-05-01"
      })
    ).toThrow(AppError);
  });

  it("rejects invalid region filters", () => {
    expect(() =>
      parseStatisticsQuery({
        metric: "delivery_rate",
        regions: "north,central",
        from: "2026-05-01",
        to: "2026-05-07"
      })
    ).toThrow(AppError);
  });

  it("rejects date ranges where to is before from", () => {
    expect(() =>
      parseStatisticsQuery({
        metric: "failure_rate",
        from: "2026-05-07",
        to: "2026-05-01"
      })
    ).toThrow(AppError);
  });

  it("allows a one-month date range", () => {
    const query = parseStatisticsQuery({
      metric: "total_packages",
      from: "2026-05-01",
      to: "2026-05-31"
    });

    expect(query.days).toBe(31);
  });
});
