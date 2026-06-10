import { defineConfig } from "vite";
import { createReadStream } from "node:fs";
import { cp, stat } from "node:fs/promises";
import { resolve, join, normalize } from "node:path";

const ROOT = import.meta.dirname;
const ASSETS_DIR = resolve(ROOT, "assets");

// All generated game assets are PNGs referenced at runtime by *relative* string
// URLs ("assets/...") built by the Python pipeline — they are never imported
// into the module graph, so Vite doesn't see them. This plugin keeps them
// working in both modes without touching the pipeline or MANIFEST paths:
//   - dev:   serve /assets/* straight off disk
//   - build: copy assets/ verbatim into dist/assets/
function booshAssets() {
  let isBuild = false;
  let copied = false;
  return {
    name: "boosh-assets",
    configResolved(config) {
      // closeBundle fires for serve, test (vitest) and once per build
      // environment in Vite 8 — only copy for a real `vite build`, and only once.
      isBuild = config.command === "build";
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || "").split("?")[0];
        if (!url.startsWith("/assets/")) return next();
        // contain the path to ASSETS_DIR (no traversal)
        const rel = normalize(decodeURIComponent(url.slice("/assets/".length)));
        if (rel.startsWith("..")) return next();
        const file = join(ASSETS_DIR, rel);
        stat(file)
          .then((s) => {
            if (!s.isFile()) return next();
            const types = { png: "image/png", glb: "model/gltf-binary", json: "application/json" };
            const ext = file.split(".").pop().toLowerCase();
            res.setHeader("Content-Type", types[ext] || "application/octet-stream");
            createReadStream(file).pipe(res);
          })
          .catch(() => next());
      });
    },
    async closeBundle() {
      if (!isBuild || copied) return; // build only, exactly once
      copied = true;
      const out = resolve(ROOT, "dist", "assets");
      try {
        await cp(ASSETS_DIR, out, {
          recursive: true,
          // skip gitignored intermediate art (assets/ui/_*.png) — not deployable
          filter: (src) => !/(^|[\\/])_[^\\/]*\.png$/.test(src),
        });
      } catch (e) {
        this.warn(`could not copy assets/ -> dist/assets/: ${e.message}`);
      }
    },
  };
}

export default defineConfig({
  // relative base so the same build works at the project-pages subpath
  // (https://user.github.io/game/) and at the domain root.
  base: "./",
  // publicDir holds static passthrough files copied to the dist root verbatim
  // (PWA manifest + service worker); the big generated PNG tree under assets/
  // is handled by the plugin above instead.
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Vite's own bundle goes here (dist/_app/), kept separate from the game's
    // PNGs which the plugin copies to dist/assets/ — no namespace collision.
    assetsDir: "_app",
    // keep pixel-art PNGs from being inlined as data URIs
    assetsInlineLimit: 0,
    target: "es2022",
    // three.js in its own chunk: the game code iterates fast, three never does
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes("node_modules/three") ? "three" : undefined),
      },
    },
  },
  plugins: [booshAssets()],
});
