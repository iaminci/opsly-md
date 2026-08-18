import type { Metadata } from "next";
import Script from "next/script";
import { Fira_Code } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
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
      className={`${firaCode.variable} ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="antialiased">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-NVQTEF2STY"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-NVQTEF2STY');
          `}
        </Script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('md-viewer-theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var resolvedDark = stored === 'dark' || (stored === 'system' && prefersDark) || (!stored && prefersDark);
                if (resolvedDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
                var root = document.documentElement;
                root.classList.remove('palette-monokai');
                var palette = localStorage.getItem('md-viewer-palette');
                if (palette === 'monokai') {
                  root.setAttribute('data-palette', palette);
                  root.classList.add('palette-' + palette);
                } else {
                  root.removeAttribute('data-palette');
                }
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
