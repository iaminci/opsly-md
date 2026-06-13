import Image from "next/image";
import { cn } from "@/lib/utils";

const FIND_IMAGE = {
  width: 972,
  height: 688,
  alt: "Opsly MD search with results for git across notes and folders",
} as const;

export function FindScreenshot({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-base border-2 border-border bg-card shadow-shadow",
        className
      )}
    >
      <Image
        src="/find/find-light.png"
        alt={FIND_IMAGE.alt}
        width={FIND_IMAGE.width}
        height={FIND_IMAGE.height}
        className="block h-auto w-full object-left-top dark:hidden"
        sizes="(min-width: 1024px) 45vw, 100vw"
      />
      <Image
        src="/find/find-dark.png"
        alt={FIND_IMAGE.alt}
        width={FIND_IMAGE.width}
        height={FIND_IMAGE.height}
        className="hidden h-auto w-full object-left-top dark:block"
        sizes="(min-width: 1024px) 45vw, 100vw"
      />
    </div>
  );
}
