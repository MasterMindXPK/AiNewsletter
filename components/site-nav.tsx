import Link from 'next/link'
import { ProfileMenu } from '@/components/profile-menu'
import { getSessionUser } from '@/lib/auth/session'

export async function SiteNav() {
  const user = await getSessionUser()

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
          {user ? (
            <ProfileMenu email={user.email} />
          ) : (
            <Link
              href="/login"
              className="border border-ink px-3.5 py-1.5 font-medium text-ink transition-colors duration-300 hover:bg-burgundy hover:border-burgundy hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
