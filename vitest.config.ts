import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["dist/**", "node_modules/**", "tests/integration/**"],
    globals: false,
    coverage: {
      reporter: ["text", "html"]
    }
  }
});
