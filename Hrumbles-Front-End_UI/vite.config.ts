
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import * as path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        '/api/proxy': {
          target: 'http://62.72.51.159:5005', // Your backend URL
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/proxy/, '/api/validate-candidate'),
        },
      },
      strictPort: true,
      hmr: {
        protocol: "ws",
        host: process.env.VITE_HMR_HOST || undefined,
        port: process.env.VITE_HMR_PORT ? parseInt(process.env.VITE_HMR_PORT) : 24678,
        clientPort: process.env.VITE_HMR_CLIENT_PORT ? parseInt(process.env.VITE_HMR_CLIENT_PORT) : undefined,
        timeout: 30000,
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Make sure to provide a fallback value for __WS_TOKEN__
      __WS_TOKEN__: JSON.stringify(process.env.VITE_WS_TOKEN || "development-token"),
      "process.env": env,
    },
    build: {
      outDir: "dist",
      sourcemap: mode === "development",
      chunkSizeWarningLimit: 1000, // Adjust warning limit

      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom"],
            "jspdf": ["jspdf"],
            "html2canvas": ["html2canvas"],
            "lodash": ["lodash"], // If used, split lodash
            "chart-libraries": ["recharts", "d3"], // Split chart libraries
          },
        },
      },
    },
  };
});
