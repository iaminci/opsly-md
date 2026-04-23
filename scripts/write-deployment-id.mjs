import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const id = process.env.VERCEL_DEPLOYMENT_ID ?? "";

mkdirSync(publicDir, { recursive: true });
writeFileSync(join(publicDir, "deployment-id.txt"), id, "utf8");
