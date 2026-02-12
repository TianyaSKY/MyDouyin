import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 15173,
    proxy: {
      "/api": {
        target: "http://localhost:18081",
        changeOrigin: true
      },
      "/v3/api-docs": {
        target: "http://localhost:18081",
        changeOrigin: true
      }
    }
  }
});
