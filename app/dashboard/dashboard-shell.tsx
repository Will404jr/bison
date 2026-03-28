"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ListOrdered,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "dashboard-sidebar-expanded";

const items = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/queues", label: "Queues", icon: ListOrdered },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setExpanded(stored === "true");
    } catch {
      /* ignore */
    }
  }, []);

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex min-h-screen gap-0">
      {/* Floating sidebar: not attached to screen edges */}
      <aside
        className={cn(
          "fixed left-4 top-4 z-10 flex shrink-0 flex-col rounded-2xl border border-white/10 bg-sidebar/55 text-sidebar-foreground shadow-2xl shadow-black/40 backdrop-blur-2xl backdrop-saturate-150 transition-[width] duration-200 ease-in-out",
          expanded ? "w-52" : "w-16"
        )}
        style={{ height: "calc(100vh - 2rem)" }}
        aria-label="Dashboard navigation"
      >
        <div className="flex flex-col h-full py-4">
          <Link
            href="/"
            className="mx-2 mb-6 flex items-center gap-3 rounded-lg px-2 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="Back to site"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/20 text-sidebar-primary">
              <Home className="size-4" />
            </span>
            {expanded && <span className="truncate text-sm font-medium">Back to site</span>}
          </Link>
          <nav className="flex flex-1 flex-col gap-1 px-2">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2 py-2.5 text-sidebar-foreground transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-5 shrink-0" />
                  {expanded && <span className="truncate text-sm font-medium">{label}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-sidebar-border px-2 pt-2">
            <button
              type="button"
              onClick={toggle}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              {expanded ? (
                <PanelLeftClose className="size-5 shrink-0" />
              ) : (
                <PanelLeft className="size-5 shrink-0" />
              )}
              {expanded && <span className="text-sm font-medium">Collapse</span>}
            </button>
            {expanded && (
              <div className="px-2 pb-2 pt-1 text-center text-xs text-muted-foreground">
                QMS
              </div>
            )}
          </div>
        </div>
      </aside>
      {/* Main content: offset by sidebar width so it doesn't sit under the floating sidebar */}
      <div
        className={cn(
          "flex-1 transition-[margin-left] duration-200 ease-in-out",
          expanded ? "ml-56" : "ml-20"
        )}
      >
        <main className="min-h-screen overflow-auto">{children}</main>
      </div>
    </div>
  );
}
