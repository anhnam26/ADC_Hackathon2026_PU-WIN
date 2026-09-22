import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import dayzeroApi from './server/plugin.mjs';
import {normalizePath} from 'vite';
import {resolve} from 'node:path';

export default defineConfig({
  plugins: [react(),dayzeroApi()],
  base: "./",
  server:{fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**',`${normalizePath(resolve('data'))}/**`,normalizePath(resolve(process.env.DAYZERO_DATA_FILE||'data/dayzero.json'))]}},
  test: { include: ["tests/unit/**/*.test.ts"] },
});
