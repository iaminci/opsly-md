/**
 * Minimal site footer. Sits in the `LandingPage` content column; top border
 * matches header and section line width (inset, not full-bleed).
 */
export function SiteFooter() {
  return (
    <footer className="mt-20 w-full border-t-2 border-border">
      <div className="flex items-center justify-between py-8 text-m text-muted-foreground text-semibold">
        <span>© 2026 Opsly MD</span>
      </div>
    </footer>
  );
}
