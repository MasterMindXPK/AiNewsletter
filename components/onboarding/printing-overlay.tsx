const LINES = ["w-full", "w-4/5", "w-full", "w-3/5", "w-11/12"];

export function PrintingOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-paper px-6 motion-safe:animate-fade-in"
    >
      <div className="w-full max-w-xs text-center">
        <p className="font-serif text-3xl font-medium tracking-[-0.02em] text-ink">Your Orbit</p>
        <div className="mx-auto mt-6 space-y-3" aria-hidden="true">
          {LINES.map((width, index) => (
            <span
              key={index}
              className={`mx-auto block h-px origin-left bg-ink motion-safe:animate-draw-line ${width}`}
              style={{ animationDelay: `${index * 350}ms` }}
            />
          ))}
        </div>
        <p className="mt-8 font-serif text-lg italic text-ink-muted">Printing your first edition…</p>
      </div>
    </div>
  );
}
