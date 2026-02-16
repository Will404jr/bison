"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Service = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category?: { id: string; name: string } | null;
};

function groupByCategory(services: Service[]) {
  const byCategory = new Map<string | null, Service[]>();
  for (const s of services) {
    const key = s.category?.id ?? null;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(s);
  }
  const categories = Array.from(byCategory.entries())
    .filter(([_, list]) => list.length > 0)
    .map(([categoryId, list]) => ({
      categoryId,
      categoryName: list[0]?.category?.name ?? "Other",
      services: list,
    }));
  return categories;
}

export default function KioskPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<{
    ticketNumber: string;
    waitingAhead: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load services");
        return res.json();
      })
      .then(setServices)
      .catch(() => setError("Failed to load services"))
      .finally(() => setLoading(false));
  }, []);

  async function takeTicket(serviceId: string) {
    setSubmitting(serviceId);
    setError(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get ticket");
      setSelectedTicket({
        ticketNumber: data.ticketNumber,
        waitingAhead: data.waitingAhead ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(null);
    }
  }

  if (selectedTicket) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Your ticket</CardTitle>
            <CardDescription className="text-center">
              Wait for your number to be called
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div
              className="text-5xl font-bold tracking-tight text-primary"
              aria-live="polite"
            >
              {selectedTicket.ticketNumber}
            </div>
            {selectedTicket.waitingAhead > 0 && (
              <p className="text-muted-foreground text-sm">
                Approximately {selectedTicket.waitingAhead} people ahead of you
              </p>
            )}
            <Button
              size="lg"
              onClick={() => setSelectedTicket(null)}
              className="w-full"
            >
              Get another ticket
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const grouped = groupByCategory(services);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Select your service
          </CardTitle>
          <CardDescription className="text-center">
            Tap a service to receive your ticket number
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-center text-muted-foreground">Loading…</p>
          )}
          {error && (
            <p className="mb-4 text-center text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="space-y-6">
            {grouped.map(({ categoryName, services: list }) => (
              <div key={categoryName}>
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                  {categoryName}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {list.map((s) => (
                    <Button
                      key={s.id}
                      size="lg"
                      variant="outline"
                      className="h-auto min-h-20 flex flex-col items-center justify-center gap-1 py-4 text-base"
                      onClick={() => takeTicket(s.id)}
                      disabled={!!submitting}
                      aria-label={`Get ticket for ${s.name}`}
                    >
                      <span className="font-semibold">{s.name}</span>
                      {s.description && (
                        <span className="text-muted-foreground text-xs font-normal">
                          {s.description}
                        </span>
                      )}
                      {submitting === s.id && (
                        <span className="text-muted-foreground text-xs">
                          Please wait…
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
