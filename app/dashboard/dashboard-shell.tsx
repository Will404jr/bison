"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ListOrdered,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Home,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "dashboard-sidebar-expanded";

const items = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/branches", label: "Branches", icon: Building2 },
  { href: "/dashboard/queues", label: "Queues", icon: ListOrdered },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

const navItemClass = (expanded: boolean) =>
  cn(
    "flex items-center rounded-lg transition-colors",
    expanded ? "gap-3 px-2 py-2.5" : "justify-center px-0 py-2.5"
  );

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
      <aside
        className={cn(
          "glass-panel-strong fixed left-4 top-4 z-10 flex shrink-0 flex-col rounded-2xl text-sidebar-foreground shadow-2xl shadow-black/40 transition-[width] duration-200 ease-in-out",
          expanded ? "w-52" : "w-16"
        )}
        style={{ height: "calc(100vh - 2rem)" }}
        aria-label="Dashboard navigation"
      >
        <div className="flex h-full flex-col py-4">
          <div className="mb-4 flex items-center justify-center px-2">
            <Image
              src="/logo.png"
              alt="Company logo"
              width={200}
              height={91}
              className={cn(
                "object-contain",
                expanded ? "h-12 w-auto" : "h-auto w-full"
              )}
              priority
            />
          </div>
          <Link
            href="/"
            className={cn(
              navItemClass(expanded),
              "mx-2 mb-6 text-sidebar-foreground hover:bg-primary/10 hover:text-foreground"
            )}
            aria-label="Back to site"
          >
            <Home className="size-5 shrink-0 text-primary" />
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
                    navItemClass(expanded),
                    active
                      ? "bg-primary/15 text-foreground ring-1 ring-primary/25"
                      : "text-sidebar-foreground hover:bg-primary/10 hover:text-foreground"
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
              className={cn(
                navItemClass(expanded),
                "w-full text-sidebar-foreground hover:bg-primary/10 hover:text-foreground"
              )}
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
          </div>
        </div>
      </aside>
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
