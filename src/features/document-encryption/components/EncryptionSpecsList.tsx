import { getDefaultEncryptionSpecs } from "../encryption-details";

function SpecLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

export function EncryptionSpecsList() {
  const specs = getDefaultEncryptionSpecs();

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="text-xs font-heading uppercase tracking-wide text-muted-foreground">
        Encryption
      </p>
      <div className="mt-3">
        {specs.map((spec) => (
          <SpecLine key={spec.label} label={spec.label} value={spec.value} />
        ))}
      </div>
    </div>
  );
}
