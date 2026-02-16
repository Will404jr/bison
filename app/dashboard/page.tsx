"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Ticket, Users, ListOrdered, CheckCircle } from "lucide-react";

type Stats = {
  waiting: number;
  serving: number;
  completedToday: number;
  servicesCount: number;
  tellersCount: number;
};

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
      <header className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Hello, welcome back
          </h1>
          <p className="text-muted-foreground text-sm">
            Here’s an overview of your queue management system
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
          <span className="size-1.5 rounded-full bg-primary" />
          System active
        </span>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-16 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Waiting</p>
                  <p className="text-3xl font-bold tabular-nums">
                    {stats?.waiting ?? 0}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">tickets in queue</p>
                </div>
                <Ticket className="text-muted-foreground size-10" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Serving</p>
                  <p className="text-3xl font-bold tabular-nums">
                    {stats?.serving ?? 0}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">being served now</p>
                </div>
                <ListOrdered className="text-muted-foreground size-10" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Completed today</p>
                  <p className="text-3xl font-bold tabular-nums">
                    {stats?.completedToday ?? 0}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">tickets</p>
                </div>
                <CheckCircle className="text-muted-foreground size-10" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Queues / Tellers</p>
                  <p className="text-3xl font-bold tabular-nums">
                    {stats?.servicesCount ?? 0} / {stats?.tellersCount ?? 0}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">services · tills</p>
                </div>
                <Users className="text-muted-foreground size-10" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
            <CardDescription>
              Kiosk, teller login, and display board
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <a
              href="/kiosk"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Customer kiosk
            </a>
            <a
              href="/teller/login"
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              Teller login
            </a>
            <a
              href="/display"
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              Display board
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
