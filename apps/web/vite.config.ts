import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

function getAppVersion(): string {
  try {
    const root = path.resolve(__dirname, "../..");
    const count = execSync("git rev-list --count HEAD", { encoding: "utf-8", cwd: root }).trim();
    return `0.${count}`;
  } catch {
    try {
      const pkgPath = path.resolve(__dirname, "../package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
      return pkg?.version ?? "0.0.0";
    } catch {
      return "0.0.0";
    }
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(getAppVersion()),
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true },
    },
  },
});
