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
          className="font-serif text-[3.5rem] font-medium leading-none tracking-[-0.03em] text-ink sm:text-[5.5rem] md:text-[8rem]"
        >
          Your Orbit
        </h1>
      </div>

      <div className="mt-8 border-y border-ink py-2.5 md:mt-10">
        <div className="flex flex-col items-center gap-1 font-sans text-[11px] uppercase tracking-[0.16em] text-ink-muted sm:flex-row sm:justify-between">
          <time dateTime={isoDate}>{today}</time>
          <p className="hidden normal-case tracking-normal sm:block sm:text-[13px] sm:italic">
            <span className="font-serif text-[15px]">
              A little more informed, every morning.
            </span>
          </p>
          <p className="text-burgundy">Curated for you</p>
        </div>
      </div>
      <p className="mt-3 text-center font-serif text-[15px] italic text-ink-muted sm:hidden">
        A little more informed, every morning.
      </p>
    </section>
  )
}
