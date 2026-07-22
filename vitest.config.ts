import { defineConfig } from "vitest/config"

// Pin the timezone so date-formatting tests are deterministic on any machine/CI.
process.env.TZ = "UTC"

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    environment: "node",
    env: { TZ: "UTC" },
  },
})
