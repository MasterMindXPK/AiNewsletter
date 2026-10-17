interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function SectionHeader({ title, subtitle, className = "" }: SectionHeaderProps) {
  return (
    <div className={`my-8 md:my-12 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="h-[2px] flex-1 bg-ink" />
        <h2 className="font-serif text-xl font-semibold uppercase tracking-[0.15em] text-ink sm:text-2xl">
          {title}
        </h2>
        <div className="h-[2px] flex-1 bg-ink" />
      </div>
      <div className="mt-1 h-px w-full bg-rule" />
      {subtitle && (
        <p className="mt-2 text-center font-sans text-xs italic text-ink-muted">
          {subtitle}
        </p>
      )}
    </div>
  );
}
