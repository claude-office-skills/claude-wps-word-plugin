import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

// WPS Office 加载项需要 HTTPS，本地开发使用自签名证书
// 如没有证书文件则使用 HTTP（本地调试时 WPS 允许 HTTP localhost）
const httpsConfig = (() => {
  const certPath = path.resolve(__dirname, "certs/localhost.pem");
  const keyPath = path.resolve(__dirname, "certs/localhost-key.pem");
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
  }
  return undefined;
})();

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    host: "0.0.0.0",
    https: httpsConfig,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: { index: path.resolve(__dirname, "index.html") },
    },
  },
});
