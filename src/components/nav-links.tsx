"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string };

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 flex-wrap text-sm">
      {links.map((l) => {
        const active =
          l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={`pill ${active ? "pill-active" : ""}`}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
