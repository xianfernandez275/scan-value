import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: [".replit.dev"],
    watch: {
      // Replit's HOME lives inside the workspace and inotify watchers are
      // scarce there; skip everything vite doesn't serve.
      ignored: ["**/ios/**", "**/.local/**", "**/.cache/**", "**/dist/**", "**/supabase/**"],
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
