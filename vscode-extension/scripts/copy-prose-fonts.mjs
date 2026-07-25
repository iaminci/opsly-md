import { cpSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const source = path.join(repoRoot, "node_modules", "geist", "dist", "fonts");
const target = path.join(__dirname, "..", "media", "fonts");

if (!existsSync(source)) {
  console.warn("[copy-prose-fonts] geist fonts not found; VS Code preview will use fallbacks.");
  process.exit(0);
}

mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });
console.log("[copy-prose-fonts] copied Geist fonts to vscode-extension/media/fonts");
