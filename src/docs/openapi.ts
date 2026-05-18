import { DELIVERY_STATUSES, REGIONS, STATISTICS_METRICS } from "../common/domain.js";

const errorResponseSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: {
          description: "Optional machine-readable details for validation or business errors.",
          nullable: true
        }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
} as const;

const deliveryEventResponseSchema = {
  type: "object",
  required: ["id", "packageId", "driverId", "status", "timestamp", "createdAt"],
  properties: {
    id: { type: "string" },
    packageId: { type: "string" },
    driverId: { type: "string" },
    status: { type: "string", enum: DELIVERY_STATUSES },
    timestamp: { type: "string", format: "date-time" },
    createdAt: { type: "string", format: "date-time" }
  },
  additionalProperties: false
} as const;

export const healthRouteSchema = {
  tags: ["Health"],
  summary: "Check that the API is running.",
  response: {
    200: {
      type: "object",
      required: ["status"],
      properties: {
        status: { type: "string" }
      },
      additionalProperties: false
    }
  }
} as const;

export const uploadDriversRouteSchema = {
  tags: ["Drivers"],
  summary: "Upload drivers from a CSV or tab-separated file.",
  consumes: ["multipart/form-data"],
  body: {
    type: "object",
    required: ["file"],
    properties: {
      file: {
        isFile: true,
        description: "CSV or tab-separated file containing driver_id, name, phone_number, email, and region."
      }
    }
  },
  response: {
    201: {
      type: "object",
      required: ["imported"],
      properties: {
        imported: { type: "integer", minimum: 0 }
      },
      additionalProperties: false
    },
    400: errorResponseSchema,
    500: errorResponseSchema
  }
} as const;

export const createDeliveryEventRouteSchema = {
  tags: ["Delivery Events"],
  summary: "Record one delivery event for an existing driver.",
  body: {
    type: "object",
    required: ["packageId", "driverId", "status", "timestamp"],
    properties: {
      packageId: { type: "string", minLength: 1 },
      driverId: { type: "string", minLength: 1 },
      status: { type: "string", enum: DELIVERY_STATUSES },
      timestamp: { type: "string", format: "date-time" }
    },
    additionalProperties: false
  },
  response: {
    201: deliveryEventResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
} as const;

export const getStatisticsRouteSchema = {
  tags: ["Statistics"],
  summary: "Query delivery statistics by metric, driver, region, and date range.",
  querystring: {
    type: "object",
    required: ["metric"],
    properties: {
      metric: {
        type: "string",
        enum: STATISTICS_METRICS
      },
      driverIds: {
        type: "string",
        description: "Comma-separated driver IDs. Omit for all drivers."
      },
      regions: {
        type: "string",
        description: `Comma-separated regions. Supported values: ${REGIONS.join(", ")}. Omit for all regions.`
      },
      from: {
        type: "string",
        format: "date",
        description: "Start date in YYYY-MM-DD format. Must be provided with to."
      },
      to: {
        type: "string",
        format: "date",
        description: "Inclusive end date in YYYY-MM-DD format. Must be provided with from."
      }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: "object",
      required: ["metric", "value", "range", "filters", "counts"],
      properties: {
        metric: { type: "string", enum: STATISTICS_METRICS },
        value: { type: "number" },
        range: {
          type: "object",
          required: ["from", "to", "days"],
          properties: {
            from: { type: "string", format: "date-time" },
            to: { type: "string", format: "date-time" },
            days: { type: "integer", minimum: 1 }
          },
          additionalProperties: false
        },
        filters: {
          type: "object",
          required: ["driverIds", "regions"],
          properties: {
            driverIds: {
              oneOf: [{ type: "array", items: { type: "string" } }, { type: "string", enum: ["all"] }]
            },
            regions: {
              oneOf: [{ type: "array", items: { type: "string", enum: REGIONS } }, { type: "string", enum: ["all"] }]
            }
          },
          additionalProperties: false
        },
        counts: {
          type: "object",
          required: ["totalPackages", "deliveredPackages", "failedPackages"],
          properties: {
            totalPackages: { type: "integer", minimum: 0 },
            deliveredPackages: { type: "integer", minimum: 0 },
            failedPackages: { type: "integer", minimum: 0 }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    400: errorResponseSchema,
    500: errorResponseSchema
  }
} as const;
