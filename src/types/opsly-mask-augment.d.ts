/** Ensures OPSLY_MASK_TOGGLE_ATTR / useSecureFenceBehavior resolve (opsly-mask ≥0.9). */
import "opsly-mask";

declare module "opsly-mask" {
  export const OPSLY_MASK_TOGGLE_ATTR: "data-opsly-mask-toggle";
  export function useSecureFenceBehavior():
    | Readonly<{
        revealed: boolean;
        setRevealed: import("react").Dispatch<import("react").SetStateAction<boolean>>;
        toggle: () => void;
        contentId: string;
        groupLabelId: string;
      }>
    | null;
}
