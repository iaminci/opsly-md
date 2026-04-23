import fs from "node:fs/promises";
import path from "node:path";
import { LandingPage } from "@/components/LandingPage";

export default async function Home() {
  const content = await fs.readFile(
    path.join(process.cwd(), "content", "homepage.md"),
    "utf8",
  );
  return <LandingPage content={content} />;
}
