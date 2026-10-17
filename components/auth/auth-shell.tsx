import type { ReactNode } from "react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return (
    <main className="mx-auto w-full max-w-md px-5 pb-20 pt-12 md:pt-20">
      <div className="relative py-8 text-center">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px origin-center bg-ink motion-safe:animate-draw-line"
        />
        <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-burgundy motion-safe:animate-fade-in motion-safe:[animation-delay:300ms]">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-serif text-4xl font-medium leading-tight tracking-[-0.02em] text-ink motion-safe:animate-fade-up md:text-5xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm font-serif text-base italic text-ink-muted motion-safe:animate-fade-in motion-safe:[animation-delay:450ms]">
          {description}
        </p>
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px origin-center bg-rule motion-safe:animate-draw-line motion-safe:[animation-delay:200ms]"
        />
      </div>
      <div className="mt-8 motion-safe:animate-fade-up motion-safe:[animation-delay:400ms]">
        {children}
      </div>
    </main>
  );
}
