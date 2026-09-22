import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import dayzeroApi from './server/plugin.mjs';

export default defineConfig({
  plugins: [react(),dayzeroApi()],
  base: "./",
  test: { include: ["tests/unit/**/*.test.ts"] },
});
