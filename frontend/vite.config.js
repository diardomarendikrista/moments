import { defineConfig } from "vite";
import dns from "dns";
import react from "@vitejs/plugin-react";
import jsconfigPaths from "vite-jsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

dns.setDefaultResultOrder("verbatim");

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), jsconfigPaths(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      "./runtimeConfig": "./runtimeConfig.browser",
    },
  },
  optimizeDeps: {
    include: ["process"],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  ssr: {
    noExternal: ["react-helmet-async"],
  },
});
