"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";

const baseLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/players", label: "Players" },
  { href: "/owners", label: "Owners" },
  { href: "/lottery", label: "Lottery" },
  { href: "/auction", label: "Auction" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/standings", label: "Standings" },
  { href: "/playoffs", label: "Playoffs" },
  { href: "/stats", label: "Stats" },
];

type HeaderSession = { username: string; role: "ADMIN" | "READ_ONLY" } | null;

export function SiteHeader({ session }: { session: HeaderSession }) {
  const pathname = usePathname();

  if (!session) {
    return (
      <header className="no-print sticky top-0 z-40 border-b border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center px-4 py-3 sm:px-6">
          <span className="font-heading text-sm font-bold tracking-tight">
            <span className="text-accent">Foos</span>Konnekt
          </span>
        </div>
      </header>
    );
  }

  const links =
    session.role === "ADMIN" ? [...baseLinks, { href: "/admin", label: "Admin" }] : baseLinks;

  return (
    <header className="no-print sticky top-0 z-40 border-b border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur supports-backdrop-filter:bg-sidebar/80">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            className="shrink-0 font-heading text-sm font-bold tracking-tight"
          >
            <span className="text-accent">Foos</span>Konnekt
          </Link>
          <div className="flex items-center gap-1">
            <span className="hidden px-1 text-xs text-sidebar-foreground/60 sm:inline">
              {session.username} · {session.role === "ADMIN" ? "Admin" : "Read-only"}
            </span>
            <ThemeToggle />
            <form action={logout}>
              <Button type="submit" variant="ghost" size="icon-sm" aria-label="Log out">
                <LogOut />
              </Button>
            </form>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {links.map((link) => {
            const isActive =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-2.5 py-1.5 font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
