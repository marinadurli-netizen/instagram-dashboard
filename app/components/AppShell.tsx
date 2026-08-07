"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu, X, type LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// Add future tools (script writer, hook generator, teleprompter, boards)
// here — the shell and mobile drawer already handle any number of items.
const NAV_ITEMS: NavItem[] = [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // A fixed sidebar eats half a phone screen, so mobile gets a top bar +
  // slide-in drawer instead — closed automatically on navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen md:flex">
      <aside
        className="hidden shrink-0 border-r md:flex md:w-60 md:flex-col"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      >
        <Brand />
        <SidebarNav pathname={pathname} />
      </aside>

      <div
        className="flex items-center justify-between border-b p-4 md:hidden"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      >
        <span className="font-semibold" style={{ color: "var(--text)" }}>
          Content Studio
        </span>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          style={{ color: "var(--text)" }}
        >
          <Menu size={22} />
        </button>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 flex h-full w-64 flex-col"
            style={{ background: "var(--panel)" }}
          >
            <div
              className="flex items-center justify-between border-b p-4"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="font-semibold" style={{ color: "var(--text)" }}>
                Content Studio
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                style={{ color: "var(--text)" }}
              >
                <X size={22} />
              </button>
            </div>
            <SidebarNav pathname={pathname} />
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

function Brand() {
  return (
    <div className="border-b p-4" style={{ borderColor: "var(--border)" }}>
      <span className="font-semibold" style={{ color: "var(--text)" }}>
        Content Studio
      </span>
    </div>
  );
}

function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{
              background: active ? "var(--panel-2)" : "transparent",
              color: active ? "var(--text)" : "var(--muted)",
            }}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
