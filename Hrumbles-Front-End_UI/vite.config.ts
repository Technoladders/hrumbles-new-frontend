// vite.config.ts (No changes needed, this is what you already have)
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import * as path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8081,
      proxy: {
        // ... (your existing /api/proxy rule)

        // Proxy for your Vercel-deployed serverless functions (for local testing)
        // This will intercept requests from your frontend like:
        // http://localhost:8081/api/company-employee-proxy?endpoint=company-encrypt
        // and forward them to:
        // https://hrumblesdevelop.vercel.app/api/company-employee-proxy?endpoint=company-encrypt
        '/api/company-employee-proxy': {
          target: 'https://hrumblesdevelop.vercel.app', // The base URL of your Vercel deployment
          changeOrigin: true, // Needed for virtual hosting
          // The rewrite is important to ensure the target path is correct
          // In this case, we want the entire matched path to be forwarded
          rewrite: (path) => path, // No replacement needed here, path is already correct
          secure: true, // Your Vercel app is HTTPS
        },
        '/api/dual-encrypt-proxy': {
          target: 'https://hrumblesdevelop.vercel.app', // The base URL of your Vercel deployment
          changeOrigin: true,
          rewrite: (path) => path, // No replacement needed here, path is already correct
          secure: true, // Your Vercel app is HTTPS
        },
      },
      strictPort: true,
      hmr: {
        protocol: "ws",
        host: process.env.VITE_HMR_HOST || undefined,
        port: process.env.VITE_HMR_PORT ? parseInt(process.env.VITE_HMR_PORT) : 24679,
        clientPort: process.env.VITE_HMR_CLIENT_PORT ? parseInt(process.env.VITE_HMR_CLIENT_PORT) : undefined,
        timeout: 30000,
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        'pdf-parse': path.resolve(__dirname, 'node_modules/pdf-parse/lib/pdf-parse.js'),
      },
      dedupe: ['react', 'react-dom']
    },
    optimizeDeps: {
    include: ['pdf-parse'],
  },
    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION),
      __WS_TOKEN__: JSON.stringify(process.env.VITE_WS_TOKEN || "development-token"),
      "process.env": env,
    },
    build: {
      outDir: "dist",
      sourcemap: mode === "development",
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom"],
            "jspdf": ["jspdf"],
            "html2canvas": ["html2canvas"],
            "lodash": ["lodash"],
            "chart-libraries": ["recharts", "d3"],
          },
        },
      },
    },
  };
});