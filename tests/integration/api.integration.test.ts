import { readFile } from "node:fs/promises";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";

const testDriverIds = ["INT-1", "INT-2"];
const testPackageIds = ["INT-PKG-1001", "INT-PKG-1002", "INT-PKG-1003", "INT-PKG-404"];
const driversFixturePath = new URL("../fixtures/integration-drivers.csv", import.meta.url);

function multipartFilePayload(fileContents: string) {
  // Fastify inject does not build multipart bodies for us, so the test creates a
  // small multipart payload by hand to exercise the real upload endpoint.
  const boundary = "----relay-engine-test-boundary";
  const payload = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="drivers.csv"',
    "Content-Type: text/csv",
    "",
    fileContents,
    `--${boundary}--`,
    ""
  ].join("\r\n");

  return {
    payload,
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`
    }
  };
}

async function createEvent(app: FastifyInstance, body: Record<string, unknown>) {
  return app.inject({
    method: "POST",
    url: "/delivery-events",
    payload: body
  });
}

async function deleteIntegrationTestData() {
  await prisma.deliveryEvent.deleteMany({
    where: {
      OR: [{ packageId: { in: testPackageIds } }, { driverId: { in: testDriverIds } }]
    }
  });
  await prisma.driver.deleteMany({
    where: {
      driverId: { in: testDriverIds }
    }
  });
}

describe("Relay Engine API integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    // Clean only records owned by the integration tests. This keeps a developer's
    // manual test data intact when they run the integration suite locally.
    await deleteIntegrationTestData();
  });

  afterEach(async () => {
    // Leave the database clean after each test too, not just before the next one.
    await deleteIntegrationTestData();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("uploads drivers, records events, and returns delivery statistics", async () => {
    // This test covers the full happy path through HTTP, validation, services,
    // repositories, Prisma, and PostgreSQL.
    const driverFile = await readFile(driversFixturePath, "utf8");
    const upload = multipartFilePayload(driverFile);

    const uploadResponse = await app.inject({
      method: "POST",
      url: "/drivers/upload",
      payload: upload.payload,
      headers: upload.headers
    });

    expect(uploadResponse.statusCode).toBe(201);
    expect(uploadResponse.json()).toEqual({ imported: 2 });

    await createEvent(app, {
      packageId: "INT-PKG-1001",
      driverId: "INT-1",
      status: "delivered",
      timestamp: "2026-05-15T10:00:00.000Z"
    });
    await createEvent(app, {
      packageId: "INT-PKG-1002",
      driverId: "INT-1",
      status: "failed",
      timestamp: "2026-05-15T11:00:00.000Z"
    });
    await createEvent(app, {
      packageId: "INT-PKG-1003",
      driverId: "INT-1",
      status: "picked_up",
      timestamp: "2026-05-15T09:00:00.000Z"
    });
    // Same package, later timestamp. Statistics should count the latest status
    // only, so this package becomes delivered.
    await createEvent(app, {
      packageId: "INT-PKG-1003",
      driverId: "INT-1",
      status: "delivered",
      timestamp: "2026-05-15T12:00:00.000Z"
    });

    const statisticsResponse = await app.inject({
      method: "GET",
      url: "/delivery-statistics?metric=delivery_rate&driverIds=INT-1&regions=north&from=2026-05-15&to=2026-05-15"
    });

    expect(statisticsResponse.statusCode).toBe(200);
    expect(statisticsResponse.json()).toMatchObject({
      metric: "delivery_rate",
      value: 2 / 3,
      counts: {
        totalPackages: 3,
        deliveredPackages: 2,
        failedPackages: 1
      }
    });
  });

  it("returns 404 when creating an event for an unknown driver", async () => {
    const response = await createEvent(app, {
      packageId: "INT-PKG-404",
      driverId: "INT-missing-driver",
      status: "delivered",
      timestamp: "2026-05-15T10:00:00.000Z"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: {
        code: "NOT_FOUND",
        message: "Driver 'INT-missing-driver' does not exist"
      }
    });
  });
});
