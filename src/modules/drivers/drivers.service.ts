import { parse } from "csv-parse/sync";
import { badRequest } from "../../common/errors.js";
import type { DriverInput } from "./drivers.schema.js";
import { driverInputSchema } from "./drivers.schema.js";
import { DriversRepository } from "./drivers.repository.js";

type CsvRecord = Record<string, string | undefined>;

// Uploaded files may come from humans or spreadsheet exports, so we accept a few
// common header names and normalize them into DriverInput.
const HEADER_ALIASES: Record<keyof DriverInput, string[]> = {
  driverId: ["driver_id", "driver id", "driverid", "id"],
  name: ["name", "driver name"],
  phoneNumber: ["phone_number", "phone number", "phone", "mobile"],
  email: ["email", "email address"],
  region: ["region"]
};

const CANONICAL_HEADERS: Record<keyof DriverInput, string> = {
  driverId: "driver_id",
  name: "name",
  phoneNumber: "phone_number",
  email: "email",
  region: "region"
};

export class DriversService {
  constructor(private readonly driversRepository = new DriversRepository()) {}

  async importFromCsv(csvBuffer: Buffer): Promise<{ imported: number }> {
    // Parse first, then validate every row before writing anything to the DB.
    // This prevents partial imports when one row is invalid.
    const records = this.parseCsv(csvBuffer);

    if (records.length === 0) {
      throw badRequest("CSV file must contain at least one driver row");
    }

    this.validateRequiredHeaders(records[0]);

    const drivers: DriverInput[] = [];
    const seenDriverIds = new Set<string>();
    const rowErrors: Array<{ row: number; errors: unknown }> = [];

    records.forEach((record, index) => {
      const rowNumber = index + 2; // +2 because CSV row 1 contains headers.
      const normalized = this.normalizeRecord(record);
      // Zod validates required fields, email format, and supported regions.
      const parsed = driverInputSchema.safeParse(normalized);

      if (!parsed.success) {
        rowErrors.push({ row: rowNumber, errors: parsed.error.flatten().fieldErrors });
        return;
      }

      // A duplicate inside one upload is treated as an error because it is
      // ambiguous which row should win.
      if (seenDriverIds.has(parsed.data.driverId)) {
        rowErrors.push({
          row: rowNumber,
          errors: { driverId: [`Duplicate driver_id '${parsed.data.driverId}' in CSV file`] }
        });
        return;
      }

      seenDriverIds.add(parsed.data.driverId);
      drivers.push(parsed.data);
    });

    if (rowErrors.length > 0) {
      throw badRequest("Driver CSV contains invalid rows", rowErrors);
    }

    // Upserts make repeated imports operationally friendly: a corrected CSV can update
    // existing drivers without needing a separate edit endpoint.
    const imported = await this.driversRepository.upsertMany(drivers);
    return { imported };
  }

  private parseCsv(csvBuffer: Buffer): CsvRecord[] {
    try {
      return parse(csvBuffer, {
        bom: true,
        columns: true,
        // Supports both normal CSV files and tab-separated files exported from
        // spreadsheets or copied from tables.
        delimiter: [",", "\t"],
        skip_empty_lines: true,
        trim: true
      }) as CsvRecord[];
    } catch (error) {
      throw badRequest("CSV file could not be parsed", {
        reason: error instanceof Error ? error.message : "Unknown CSV parsing error"
      });
    }
  }

  private normalizeRecord(record: CsvRecord): Record<keyof DriverInput, string | undefined> {
    const normalizedHeaders = new Map<string, string | undefined>();

    // Header matching is case-insensitive and ignores surrounding spaces.
    for (const [key, value] of Object.entries(record)) {
      normalizedHeaders.set(key.trim().toLowerCase(), value);
    }

    return {
      driverId: this.readAliasedValue(normalizedHeaders, HEADER_ALIASES.driverId),
      name: this.readAliasedValue(normalizedHeaders, HEADER_ALIASES.name),
      phoneNumber: this.readAliasedValue(normalizedHeaders, HEADER_ALIASES.phoneNumber),
      email: this.readAliasedValue(normalizedHeaders, HEADER_ALIASES.email),
      // Regions are case-insensitive on upload, but stored in lowercase because
      // the database enum values are lowercase.
      region: this.readAliasedValue(normalizedHeaders, HEADER_ALIASES.region)?.toLowerCase()
    };
  }

  private validateRequiredHeaders(record: CsvRecord) {
    const headers = new Set(Object.keys(record).map((header) => header.trim().toLowerCase()));
    const missingColumns = (Object.keys(HEADER_ALIASES) as Array<keyof DriverInput>)
      .filter((fieldName) => !HEADER_ALIASES[fieldName].some((alias) => headers.has(alias)))
      .map((fieldName) => CANONICAL_HEADERS[fieldName]);

    if (missingColumns.length > 0) {
      throw badRequest("Driver CSV is missing required columns", {
        missingColumns,
        requiredColumns: Object.values(CANONICAL_HEADERS)
      });
    }
  }

  private readAliasedValue(headers: Map<string, string | undefined>, aliases: string[]): string | undefined {
    for (const alias of aliases) {
      const value = headers.get(alias);

      if (value !== undefined) {
        return value;
      }
    }

    return undefined;
  }
}
