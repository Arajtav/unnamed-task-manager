import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import devtools from "solid-devtools/vite";
import lucidePreprocess from "vite-plugin-lucide-preprocess";
import checker from "vite-plugin-checker";

export default defineConfig({
    plugins: [
        lucidePreprocess(),
        devtools(),
        solidPlugin(),
        tailwindcss(),
        checker({ typescript: true }),
    ],
    server: {
        host: "0.0.0.0",
        port: 3000,
        allowedHosts: true,
    },
    build: {
        target: "esnext",
    },
});
