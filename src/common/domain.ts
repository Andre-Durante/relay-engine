// These arrays are the application-level enums used by validation and services.
// Keeping them here avoids duplicating allowed values across modules.
export const REGIONS = ["north", "south", "east", "west"] as const;
export type Region = (typeof REGIONS)[number];

export const DELIVERY_STATUSES = [
  "picked_up",
  "in_transit",
  "delivered",
  "failed",
  "returned"
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const STATISTICS_METRICS = [
  "total_packages",
  "delivery_rate",
  "failure_rate",
  "average_deliveries_per_day"
] as const;
export type StatisticsMetric = (typeof STATISTICS_METRICS)[number];
