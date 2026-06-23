"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ticket, Users, ListOrdered, CheckCircle, type LucideIcon } from "lucide-react";

type Stats = {
  waiting: number;
  serving: number;
  completedToday: number;
  servicesCount: number;
  tellersCount: number;
};

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  subtext: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div className="space-y-1">
          <p className="text-sm text-foreground/70">{label}</p>
          <p className="text-3xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-foreground/55">{subtext}</p>
        </div>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <Icon className="size-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardHomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.ok ? res.json() : null)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <header className="glass-panel-strong mb-8 flex flex-col gap-4 rounded-2xl px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Dashboard
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Hello, welcome back
          </h1>
          <p className="text-sm text-foreground/70">
            Here’s an overview of your queue management system
          </p>
        </div>
        <span className="glass-panel inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border-0 px-3 py-1 text-xs font-medium text-primary shadow-none">
          <span className="size-1.5 rounded-full bg-primary" />
          System active
        </span>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 rounded bg-muted/50" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Waiting"
            value={stats?.waiting ?? 0}
            subtext="tickets in queue"
            icon={Ticket}
          />
          <StatCard
            label="Serving"
            value={stats?.serving ?? 0}
            subtext="being served now"
            icon={ListOrdered}
          />
          <StatCard
            label="Completed today"
            value={stats?.completedToday ?? 0}
            subtext="tickets"
            icon={CheckCircle}
          />
          <StatCard
            label="Queues / Tellers"
            value={`${stats?.servicesCount ?? 0} / ${stats?.tellersCount ?? 0}`}
            subtext="services · tills"
            icon={Users}
          />
        </div>
      )}

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
            <CardDescription>
              Customer Menu, teller login, and display board
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Button asChild className="h-11 w-full">
              <Link href="/menu/login">Customer Menu</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full">
              <Link href="/teller/login">Teller login</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full">
              <Link href="/display/login">Display board</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
