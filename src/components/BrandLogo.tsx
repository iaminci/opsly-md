import Image from "next/image";
import logo from "@/assets/logo.svg";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className, priority }: BrandLogoProps) {
  return (
    <Image
      src={logo}
      alt="Opsly MD"
      width={852}
      height={527}
      className={cn("w-auto", className)}
      priority={priority}
    />
  );
}
