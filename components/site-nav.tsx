import Link from 'next/link'
import { User } from 'lucide-react'

export function SiteNav() {
  return (
    <header className="border-b border-rule motion-safe:animate-fade-down">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 md:px-8"
      >
        <Link
          href="/"
          className="font-serif text-lg font-semibold tracking-tight text-ink transition-colors duration-300 hover:text-burgundy"
        >
          Your Orbit
        </Link>

        <div className="flex items-center gap-5 font-sans text-[13px] md:gap-8">
          <Link
            href="/"
            aria-current="page"
            className="border-b border-burgundy pb-0.5 font-medium text-ink"
          >
            Today&apos;s Edition
          </Link>
          <Link
            href="/archive"
            className="relative pb-0.5 text-ink-muted transition-colors duration-300 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-ink after:transition-transform after:duration-300 after:ease-out hover:text-ink hover:after:scale-x-100"
          >
            Archive
          </Link>
          <button
            type="button"
            aria-label="Your profile"
            className="flex size-8 items-center justify-center rounded-full border border-rule text-ink-muted transition-all duration-300 hover:scale-110 hover:border-burgundy hover:bg-burgundy hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <User className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </nav>
    </header>
  )
}
