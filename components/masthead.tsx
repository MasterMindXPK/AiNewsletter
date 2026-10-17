const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/New_York',
})

const isoFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
})

export function Masthead() {
  const now = new Date()
  const today = dateFormatter.format(now)
  const isoDate = isoFormatter.format(now)

  return (
    <section
      aria-labelledby="masthead-title"
      className="mx-auto max-w-6xl px-5 pt-10 md:px-8 md:pt-14"
    >
      <div className="text-center">
        <h1
          id="masthead-title"
          className="cursor-default font-serif text-[3.5rem] font-medium leading-none tracking-[-0.03em] text-ink transition-[letter-spacing,color] duration-700 ease-out hover:tracking-[-0.01em] hover:text-burgundy motion-safe:animate-fade-up sm:text-[5.5rem] md:text-[8rem]"
        >
          Your Orbit
        </h1>
      </div>

      <div className="relative mt-8 py-2.5 md:mt-10">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px origin-center bg-ink motion-safe:animate-draw-line motion-safe:[animation-delay:300ms]"
        />
        <div className="flex flex-col items-center gap-1 font-sans text-[11px] uppercase tracking-[0.16em] text-ink-muted motion-safe:animate-fade-in motion-safe:[animation-delay:900ms] sm:flex-row sm:justify-between">
          <time dateTime={isoDate}>{today}</time>
          <p className="hidden normal-case tracking-normal sm:block sm:text-[13px] sm:italic">
            <span className="font-serif text-[15px]">
              A little more informed, every morning.
            </span>
          </p>
          <p className="flex items-center gap-2 text-burgundy">
            <span className="relative flex size-1.5" aria-hidden="true">
              <span className="absolute inline-flex size-full rounded-full bg-burgundy opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex size-1.5 rounded-full bg-burgundy" />
            </span>
            Curated for you
          </p>
        </div>
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px origin-center bg-ink motion-safe:animate-draw-line motion-safe:[animation-delay:450ms]"
        />
      </div>
      <p className="mt-3 text-center font-serif text-[15px] italic text-ink-muted motion-safe:animate-fade-in motion-safe:[animation-delay:1000ms] sm:hidden">
        A little more informed, every morning.
      </p>
    </section>
  )
}
