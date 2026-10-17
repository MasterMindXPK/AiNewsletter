import type { ReactNode } from "react";
import { Check } from "lucide-react";
import type { OnboardingDraftData } from "@/lib/onboarding/draft";

export interface StepProps {
  data: OnboardingDraftData;
  update: (patch: Partial<OnboardingDraftData>) => void;
}

export const inputClass =
  "mt-2 block w-full border border-rule bg-transparent px-3.5 py-3 font-sans text-[15px] text-ink placeholder:text-ink-muted/60 transition-colors duration-300 hover:border-ink focus-visible:border-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

export const labelClass =
  "font-sans text-xs font-medium uppercase tracking-[0.12em] text-ink";

interface StepHeaderProps {
  eyebrow: string;
  title: string;
  description: ReactNode;
}

export function StepHeader({ eyebrow, title, description }: StepHeaderProps) {
  return (
    <header className="mb-8 border-b border-rule pb-8">
      <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-burgundy">{eyebrow}</p>
      <h2
        data-step-heading
        tabIndex={-1}
        className="mt-3 font-serif text-3xl font-medium leading-tight tracking-[-0.02em] text-ink outline-none md:text-4xl"
      >
        {title}
      </h2>
      <p className="mt-3 max-w-xl font-serif text-base italic text-ink-muted">{description}</p>
    </header>
  );
}

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 font-sans text-[13px] text-ink-muted">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-2 font-sans text-[13px] text-burgundy">
          {error}
        </p>
      )}
    </div>
  );
}

interface ChipProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}

export function Chip({ selected, onClick, children, disabled }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 border px-3.5 py-2 font-sans text-sm transition-[color,background-color,border-color,transform] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:cursor-not-allowed disabled:opacity-50 motion-safe:active:scale-[0.97] ${
        selected
          ? "border-burgundy bg-burgundy text-paper"
          : "border-rule text-ink hover:border-ink"
      }`}
    >
      {selected && <Check className="size-3.5 motion-safe:animate-fade-in" aria-hidden="true" />}
      {children}
    </button>
  );
}
