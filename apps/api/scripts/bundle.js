import { build } from "esbuild";

/**
 * Bundles the API and its job entrypoints into self-contained ESM files for the
 * production image, which then needs no node_modules at all.
 *
 * The alternative, shipping production node_modules, came to ~650MB: pnpm links
 * @better-auth/expo's optional Expo/React Native peers in from the mobile app,
 * and the server never loads any of them.
 *
 * Reads @cognis/database from source (the same condition `pnpm dev` uses), so
 * the bundle doesn't depend on that package having been built first.
 */
await build({
    entryPoints: [
        "src/index.ts",
        "src/jobs/purgeTrash.ts",
        "src/jobs/embedNotes.ts",
        "src/jobs/setAiLimit.ts",
    ],
    outdir: "bundle",
    outbase: "src",
    outExtension: { ".js": ".mjs" },

    bundle: true,
    splitting: true,
    platform: "node",
    format: "esm",
    target: "node24",
    conditions: ["@cognis/source"],

    // Optional native accelerators the libraries load inside a try/catch and
    // run fine without.
    external: ["pg-native", "bufferutil", "utf-8-validate"],

    // Some bundled dependencies are CommonJS and call require() for Node
    // builtins, which an ES module doesn't have unless it's provided.
    banner: {
        js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    },

    logLevel: "warning",
});
