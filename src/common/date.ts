const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Public API dates use YYYY-MM-DD. We convert them to UTC midnight so date
// ranges behave the same no matter where the server is running.
export function parseUtcDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// The statistics endpoint stores ranges as [from, to), so this calculates the
// number of calendar days between the inclusive start and exclusive end.
export function daySpan(fromInclusive: Date, toExclusive: Date): number {
  return Math.ceil((toExclusive.getTime() - fromInclusive.getTime()) / DAY_IN_MS);
}
