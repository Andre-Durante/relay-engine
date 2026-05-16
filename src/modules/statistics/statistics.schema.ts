import { z } from "zod";
import { addUtcDays, daySpan, parseUtcDateOnly, startOfUtcDay } from "../../common/date.js";
import { REGIONS, STATISTICS_METRICS } from "../../common/domain.js";
import { badRequest } from "../../common/errors.js";

// The public API accepts calendar dates, not arbitrary date-times, so queries
// are easier to reason about and match the "one day to one month" requirement.
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format");

// Raw query params arrive as strings from Fastify. This schema validates the
// direct HTTP shape before we normalize strings into arrays and Dates.
const statisticsRawQuerySchema = z.object({
  metric: z.enum(STATISTICS_METRICS),
  driverIds: z.string().optional(),
  regions: z.string().optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional()
});

export type StatisticsQuery = {
  metric: (typeof STATISTICS_METRICS)[number];
  driverIds?: string[];
  regions?: Array<(typeof REGIONS)[number]>;
  from: Date;
  to: Date;
  days: number;
};

export function parseStatisticsQuery(rawQuery: unknown, now = new Date()): StatisticsQuery {
  const query = statisticsRawQuerySchema.parse(rawQuery);

  // Comma-separated query params keep the endpoint simple:
  // ?driverIds=1,2&regions=north,south
  const driverIds = splitCsv(query.driverIds);
  const regions = parseRegions(query.regions);

  // A half-open date range would be confusing to callers, so require both dates
  // or neither. When neither is provided, we default to the current UTC day.
  if ((query.from && !query.to) || (!query.from && query.to)) {
    throw badRequest("'from' and 'to' must be provided together");
  }

  const from = query.from ? parseUtcDateOnly(query.from) : startOfUtcDay(now);
  // The public API treats `to` as an inclusive calendar date, while database
  // filtering uses an exclusive upper bound to avoid missing late-night events.
  const to = query.to ? addUtcDays(parseUtcDateOnly(query.to), 1) : addUtcDays(from, 1);
  const days = daySpan(from, to);

  // `to` is inclusive in the API, so same-day ranges are valid. After conversion
  // to an exclusive upper bound, `to` must still be after `from`.
  if (to <= from) {
    throw badRequest("'to' must be the same date as 'from' or a later date");
  }

  // The requirement limits statistics queries to between one day and one month.
  if (days < 1 || days > 31) {
    throw badRequest("Date range must be between one day and one month");
  }

  return {
    metric: query.metric,
    driverIds: driverIds.length > 0 ? driverIds : undefined,
    regions: regions.length > 0 ? regions : undefined,
    from,
    to,
    days
  };
}

function splitCsv(value: string | undefined): string[] {
  // Empty entries are ignored so `driverIds=1,,2` behaves like `driverIds=1,2`.
  return value
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
}

function parseRegions(value: string | undefined): Array<(typeof REGIONS)[number]> {
  const regions = splitCsv(value).map((region) => region.toLowerCase());
  const invalidRegions = regions.filter((region) => !REGIONS.includes(region as (typeof REGIONS)[number]));

  // We validate regions manually here so the error can report which values were
  // invalid and list the supported options.
  if (invalidRegions.length > 0) {
    throw badRequest("Invalid region filter", {
      invalidRegions,
      supportedRegions: REGIONS
    });
  }

  return regions as Array<(typeof REGIONS)[number]>;
}
