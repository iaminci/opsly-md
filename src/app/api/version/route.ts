import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID ?? "";
  return NextResponse.json(
    { deploymentId },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
