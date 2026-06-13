import Image from "next/image";
import { cn } from "@/lib/utils";

const HERO_IMAGE = {
  width: 1024,
  height: 543,
  alt: "Opsly MD workspace with sidebar, document editor, and table of contents",
} as const;

export function HeroScreenshot({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-base border-2 border-border bg-card shadow-shadow lg:h-full",
        className
      )}
    >
      <Image
        src="/hero/hero-light.jpg"
        alt={HERO_IMAGE.alt}
        width={HERO_IMAGE.width}
        height={HERO_IMAGE.height}
        className="block h-auto w-full object-left-top lg:h-full lg:object-cover dark:hidden"
        priority
        sizes="(min-width: 1024px) 55vw, 100vw"
      />
      <Image
        src="/hero/hero-dark.jpg"
        alt={HERO_IMAGE.alt}
        width={HERO_IMAGE.width}
        height={HERO_IMAGE.height}
        className="hidden h-auto w-full object-left-top lg:h-full lg:object-cover dark:block"
        priority
        sizes="(min-width: 1024px) 55vw, 100vw"
      />
    </div>
  );
}
