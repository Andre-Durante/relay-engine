import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

describe("OpenAPI documentation", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("exposes Swagger UI and the generated OpenAPI document", async () => {
    const uiResponse = await app.inject({
      method: "GET",
      url: "/docs"
    });
    const openApiResponse = await app.inject({
      method: "GET",
      url: "/docs/json"
    });

    expect(uiResponse.statusCode).toBe(200);
    expect(uiResponse.headers["content-type"]).toContain("text/html");
    expect(openApiResponse.statusCode).toBe(200);
    const openApiDocument = openApiResponse.json();

    expect(openApiDocument).toMatchObject({
      openapi: "3.0.3",
      info: {
        title: "Relay Engine API"
      },
      paths: {
        "/health": {},
        "/drivers/upload": {},
        "/delivery-events": {},
        "/delivery-statistics": {}
      }
    });
    expect(openApiDocument.paths["/drivers/upload"].post.requestBody.content["multipart/form-data"].schema).toEqual({
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "CSV or tab-separated file containing driver_id, name, phone_number, email, and region."
        }
      }
    });
  });
});
