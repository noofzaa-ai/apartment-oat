import { defineConfig } from "vitest/config";
import path from "node:path";

// Minimal, self-contained vitest config — scoped to lib/auth.ts logic tests only.
// node environment (no DOM needed); @/ alias mirrors tsconfig paths.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
