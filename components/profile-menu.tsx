"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { User } from "lucide-react";

interface ProfileMenuProps {
  email: string;
}

const itemClass =
  "block w-full px-4 py-2.5 text-left font-sans text-[13px] text-ink transition-colors duration-200 hover:bg-burgundy hover:text-paper focus-visible:bg-burgundy focus-visible:text-paper focus-visible:outline-none";

export function ProfileMenu({ email }: ProfileMenuProps) {
  const router = useRouter();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!open) return;

    const menu = containerRef.current?.querySelector<HTMLElement>('[role="menu"]');
    menu?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const items = Array.from(
        menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
      );
      if (items.length === 0) return;
      event.preventDefault();
      const current = items.indexOf(document.activeElement as HTMLElement);
      const step = event.key === "ArrowDown" ? 1 : -1;
      items[(current + step + items.length) % items.length].focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("[signOut] error:", error);
    } finally {
      setOpen(false);
      setSigningOut(false);
      window.location.href = "/";
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Your account"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="flex size-8 items-center justify-center rounded-full border border-rule text-ink-muted transition-all duration-300 hover:scale-110 hover:border-burgundy hover:bg-burgundy hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy data-[open=true]:border-burgundy data-[open=true]:bg-burgundy data-[open=true]:text-paper"
        data-open={open}
      >
        <User className="size-4" strokeWidth={1.5} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-3 w-56 origin-top-right border border-ink bg-paper shadow-[0_12px_32px_-12px_rgba(23,20,15,0.35)] motion-safe:animate-fade-down"
        >
          <p className="truncate border-b border-rule px-4 py-3 font-sans text-xs text-ink-muted">
            <span className="block text-[10px] uppercase tracking-[0.16em]">Signed in as</span>
            <span className="mt-0.5 block truncate text-ink">{email}</span>
          </p>
          <Link href="/profile" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            Profile
          </Link>
          <Link
            href="/settings/interests"
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            Interests
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={signingOut}
            className={`${itemClass} border-t border-rule disabled:opacity-60`}
          >
            {signingOut ? "Signing out" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
