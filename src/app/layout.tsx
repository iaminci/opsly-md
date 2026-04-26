import type { Metadata } from "next";
import { Fira_Code } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DeploymentReloadGuardProvider } from "@/components/DeploymentReloadGuard";
import { DeploymentRefreshWatcher } from "@/components/DeploymentRefreshWatcher";
import { WindowInactiveAttribute } from "@/components/WindowInactiveAttribute";
import "./globals.css";

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

function metadataBaseUrl(): URL {
  // In dev, a production NEXT_PUBLIC_SITE_URL would otherwise make all metadata
  // (including `metadata.icons` absolute URLs) point at the wrong host.
  if (process.env.NODE_ENV === "development") {
    return new URL("http://localhost:3000");
  }
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw) {
    const normalized = /^(https?:)?\/\//.test(raw) ? raw : `https://${raw}`;
    try {
      return new URL(normalized);
    } catch {
      // Invalid env breaks all metadata; fall back to vercel/localhost
    }
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  return new URL("http://localhost:3000");
}

const deploymentCacheKey = process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID
  ? `?v=${encodeURIComponent(process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID)}`
  : "";

function iconHref(path: string) {
  return `${path}${deploymentCacheKey}`;
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: "Opsly MD",
  description: "View and organize markdown documents with paste, upload, and rich rendering",
  icons: {
    icon: [
      { url: iconHref("/favicon-64.png"), type: "image/png", sizes: "64x64" },
      { url: iconHref("/favicon.ico"), sizes: "any" },
    ],
    apple: [{ url: iconHref("/apple-icon.png"), sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={firaCode.variable}
    >
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('md-viewer-theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (stored === 'dark' || (!stored && prefersDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
                var accent = localStorage.getItem('opsly-accent');
                var valid = ['amber','sky','emerald','violet','rose','indigo','orange'].indexOf(accent) >= 0;
                document.documentElement.setAttribute('data-dark-accent', valid ? accent : 'orange');
              } catch (e) {}
            `,
          }}
        />
        <ThemeProvider>
          <DeploymentReloadGuardProvider>
            <DeploymentRefreshWatcher />
            <WindowInactiveAttribute />
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster />
          </DeploymentReloadGuardProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
