import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import devtools from "solid-devtools/vite";

export default defineConfig({
    plugins: [devtools(), solidPlugin(), tailwindcss()],
    server: {
        host: "0.0.0.0",
        port: 3000,
        allowedHosts: true,
    },
    build: {
        target: "esnext",
    },
});
