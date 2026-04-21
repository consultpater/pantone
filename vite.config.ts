import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("culori")) return "vendor-culori";
            if (id.includes("fuse.js")) return "vendor-fuse";
            if (id.includes("react")) return "vendor-react";
          }
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
