import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const watch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: [path.join(__dirname, "webview/main.tsx")],
  bundle: true,
  outfile: path.join(__dirname, "media/webview.js"),
  format: "iife",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  sourcemap: watch,
  minify: !watch,
  logLevel: "info",
  alias: {
    "@": path.join(repoRoot, "src"),
  },
  loader: {
    ".woff2": "file",
    ".woff": "file",
    ".ttf": "file",
  },
  define: {
    "process.env.NODE_ENV": watch ? '"development"' : '"production"',
  },
});

if (watch) {
  await ctx.watch();
  console.log("[esbuild] watching webview...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
