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
import { ChevronLeft, ChevronRight, Ticket } from "lucide-react";

type Service = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId?: string | null;
};

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  services: Service[];
};

export default function KioskPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [uncategorizedServices, setUncategorizedServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | "other" | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<{
    ticketNumber: string;
    waitingAhead: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/services").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([cats, allServices]: [Category[], (Service & { categoryId?: string | null })[]]) => {
        setCategories(Array.isArray(cats) ? cats : []);
        const uncategorized = Array.isArray(allServices)
          ? allServices.filter((s) => !s.categoryId)
          : [];
        setUncategorizedServices(uncategorized);
      })
      .catch(() => {
        setCategories([]);
        setUncategorizedServices([]);
        setError("Failed to load menu");
      })
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

  const categoriesWithQueues = categories.filter((c) => c.services?.length > 0);
  const hasOther = uncategorizedServices.length > 0;
  const hasMenu = categoriesWithQueues.length > 0 || hasOther;

  const currentQueues: Service[] =
    selectedCategory === null
      ? []
      : selectedCategory === "other"
        ? uncategorizedServices
        : selectedCategory.services ?? [];

  const currentCategoryName =
    selectedCategory === null
      ? ""
      : selectedCategory === "other"
        ? "Other services"
        : selectedCategory.name;

  // ——— Ticket result screen ———
  if (selectedTicket) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-6 sm:p-8">
        <Card className="w-full max-w-lg border-2 shadow-lg">
          <CardHeader className="space-y-1 pb-2 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Ticket className="size-8" aria-hidden />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Your ticket
            </CardTitle>
            <CardDescription className="text-base">
              Wait for your number to be called at the display
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 pb-8 pt-2">
            <div
              className="rounded-xl bg-primary px-10 py-6 text-5xl font-bold tracking-tight text-primary-foreground shadow-md sm:text-6xl"
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
              className="h-12 w-full max-w-xs text-base"
            >
              Get another ticket
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ——— Queues view (after selecting a category) ———
  if (selectedCategory !== null) {
    return (
      <div className="flex min-h-screen flex-col bg-muted/40 p-4 sm:p-6">
        <div className="mx-auto w-full max-w-3xl flex-1 flex flex-col">
          <Button
            variant="ghost"
            className="-ml-2 mb-4 h-11 gap-2 self-start text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedCategory(null)}
            aria-label="Back to categories"
          >
            <ChevronLeft className="size-5" />
            Back to categories
          </Button>

          <Card className="flex-1 border-2 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                {currentCategoryName}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Tap a queue to get your ticket number
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {error && (
                <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              {currentQueues.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No queues in this category right now.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {currentQueues.map((s) => (
                    <Button
                      key={s.id}
                      size="lg"
                      variant="outline"
                      className="h-auto min-h-[88px] flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 py-5 text-left text-base transition-colors hover:border-primary hover:bg-primary/5"
                      onClick={() => takeTicket(s.id)}
                      disabled={!!submitting}
                      aria-label={`Get ticket for ${s.name}`}
                    >
                      <span className="font-semibold">{s.name}</span>
                      {s.description && (
                        <span className="text-muted-foreground text-xs font-normal leading-tight">
                          {s.description}
                        </span>
                      )}
                      {submitting === s.id && (
                        <span className="text-muted-foreground text-xs">Please wait…</span>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ——— Categories view (initial screen) ———
  return (
    <div className="flex min-h-screen flex-col bg-muted/40 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-3xl flex-1 flex flex-col justify-center">
        <Card className="border-2 shadow-lg">
          <CardHeader className="space-y-1 pb-6 text-center sm:pb-8">
            <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Select a category
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Choose a category to see available queues and get your ticket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <p className="py-12 text-center text-muted-foreground">Loading…</p>
            )}
            {error && (
              <p
                className="rounded-lg bg-destructive/10 px-4 py-3 text-center text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}
            {!loading && !hasMenu && (
              <p className="py-12 text-center text-muted-foreground">
                No queues available at the moment. Please try again later.
              </p>
            )}
            {!loading && hasMenu && (
              <div className="grid gap-3 sm:grid-cols-2">
                {categoriesWithQueues.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className="flex min-h-[100px] items-center justify-between gap-4 rounded-xl border-2 border-border bg-card px-5 py-4 text-left shadow-sm transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Open ${category.name} queues`}
                  >
                    <span className="font-semibold text-foreground text-lg">
                      {category.name}
                    </span>
                    <ChevronRight className="size-6 shrink-0 text-muted-foreground" />
                  </button>
                ))}
                {hasOther && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("other")}
                    className="flex min-h-[100px] items-center justify-between gap-4 rounded-xl border-2 border-border bg-card px-5 py-4 text-left shadow-sm transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Open other services queues"
                  >
                    <span className="font-semibold text-foreground text-lg">
                      Other services
                    </span>
                    <ChevronRight className="size-6 shrink-0 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
