import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// The build output is a single self-contained HTML file, since it's loaded
// into a WebView from a literal string (see scripts/stringifyHtml.js) rather
// than fetched from a server — there's nothing to fetch separate assets from.
export default defineConfig({
    base: "./",
    plugins: [viteSingleFile()],
    build: {
        outDir: "dist",
        assetsInlineLimit: Infinity,
        cssCodeSplit: false,
    },
});
