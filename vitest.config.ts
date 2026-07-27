import { defineConfig } from "vitest/config";
import path from "node:path";

// No React plugin needed: the unit suite imports only pure TS modules (no JSX/.tsx),
// which keeps the test toolchain independent of the @vitejs/plugin-react + Vite pairing.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true
  }
});
