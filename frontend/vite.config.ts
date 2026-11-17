import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// A dónde se reenvían las llamadas a /api.
// En local es el backend en tu PC; en Docker se cambia con API_URL=http://backend:3001
const apiUrl = process.env.API_URL ?? "http://localhost:3001";

export default defineConfig({
    plugins: [react()],
    server: {
        host: "0.0.0.0",
        port: 4173,
        proxy: {
            "/api": apiUrl,
        },
    },
    preview: {
        host: "0.0.0.0",
        port: 4173,
        proxy: {
            "/api": apiUrl,
        },
    },
});
