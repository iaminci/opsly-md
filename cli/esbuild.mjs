import * as esbuild from "esbuild";
import { chmodSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const watch = process.argv.includes("--watch");
const outfile = path.join(__dirname, "dist/opslymd.mjs");
const pkg = JSON.parse(readFileSync(path.join(__dirname, "package.json"), "utf8"));

const ctx = await esbuild.context({
  entryPoints: [path.join(__dirname, "src/cli.ts")],
  bundle: true,
  outfile,
  format: "esm",
  platform: "node",
  target: "node20",
  minify: !watch,
  logLevel: "info",
  banner: { js: "#!/usr/bin/env node" },
  // Shares the web app's remark plugins so terminal output follows the same parsing rules.
  alias: {
    "@": path.join(repoRoot, "src"),
  },
  define: {
    __OPSLY_CLI_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    {
      name: "mark-executable",
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length === 0) chmodSync(outfile, 0o755);
        });
      },
    },
  ],
});

if (watch) {
  await ctx.watch();
  console.log("[esbuild] watching cli...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
