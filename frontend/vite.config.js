import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // 统一从项目根目录 .env 读取端口配置
  const env = loadEnv(mode, "..", "");
  const backendPort = env.BACKEND_PORT || "18081";
  const parsedFrontendPort = Number(env.FRONTEND_PORT || "5173");
  const frontendPort = Number.isFinite(parsedFrontendPort)
    ? parsedFrontendPort
    : 5173;
  const apiBaseUrl = env.VITE_API_BASE_URL || `http://localhost:${backendPort}`;
  const mediaBaseUrl = env.VITE_MEDIA_BASE_URL || apiBaseUrl;

  return {
    envDir: "..",
    plugins: [react()],
    define: {
      "import.meta.env.VITE_BACKEND_PORT": JSON.stringify(backendPort),
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(apiBaseUrl),
      "import.meta.env.VITE_MEDIA_BASE_URL": JSON.stringify(mediaBaseUrl),
    },
    server: {
      host: "0.0.0.0",
      port: frontendPort,
    },
  };
});
