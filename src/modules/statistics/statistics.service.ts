import type { StatisticsMetric } from "../../common/domain.js";
import type { LatestStatusCounts } from "./statistics.repository.js";
import { StatisticsRepository } from "./statistics.repository.js";
import type { StatisticsQuery } from "./statistics.schema.js";

export type StatisticsResult = {
  metric: StatisticsMetric;
  value: number;
  range: {
    from: string;
    to: string;
    days: number;
  };
  filters: {
    driverIds: string[] | "all";
    regions: string[] | "all";
  };
  counts: LatestStatusCounts;
};

export class StatisticsService {
  constructor(private readonly statisticsRepository = new StatisticsRepository()) {}

  async calculate(query: StatisticsQuery): Promise<StatisticsResult> {
    // The repository returns counts from the database; this service turns those
    // counts into the metric requested by the API caller.
    const counts = await this.statisticsRepository.getLatestStatusCounts(query);

    return {
      metric: query.metric,
      value: this.calculateMetricValue(query.metric, counts, query.days),
      range: {
        from: query.from.toISOString(),
        to: query.to.toISOString(),
        days: query.days
      },
      filters: {
        driverIds: query.driverIds ?? "all",
        regions: query.regions ?? "all"
      },
      counts
    };
  }

  private calculateMetricValue(metric: StatisticsMetric, counts: LatestStatusCounts, days: number): number {
    // Rates return 0 when no packages match instead of dividing by zero.
    switch (metric) {
      case "total_packages":
        return counts.totalPackages;
      case "delivery_rate":
        return counts.totalPackages === 0 ? 0 : counts.deliveredPackages / counts.totalPackages;
      case "failure_rate":
        return counts.totalPackages === 0 ? 0 : counts.failedPackages / counts.totalPackages;
      case "average_deliveries_per_day":
        return counts.deliveredPackages / days;
    }
  }
}
