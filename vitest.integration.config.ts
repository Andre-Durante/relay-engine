import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30000,
    globals: false,
    // Integration tests exercise the REST API and PostgreSQL. Kafka publishing
    // has focused unit coverage and should not make these tests depend on a
    // local Kafka container or a developer's personal `.env` settings.
    env: {
      KAFKA_ENABLED: "false"
    }
  }
});
