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

// ——— External API types (from content API) ———
type SubSubItem = {
  id: string;
  title: string;
  url: string | null;
  position: number;
};

type SubItem = {
  id: string;
  title: string;
  url: string | null;
  position: number;
  subSubItems?: SubSubItem[];
};

type ExternalQueue = {
  id: string;
  title: string;
  url: string | null;
  position: number;
  subItems?: SubItem[];
};

type ExternalContent = {
  logo?: { url?: string };
  queues?: ExternalQueue[];
};

// ——— Internal (dashboard) types ———
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
  const [useExternal, setUseExternal] = useState(false);
  const [externalContent, setExternalContent] = useState<ExternalContent | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uncategorizedServices, setUncategorizedServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTicket, setSelectedTicket] = useState<{
    ticketNumber: string;
    waitingAhead: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  // External 3-level navigation
  const [externalLevel, setExternalLevel] = useState<0 | 1 | 2>(0);
  const [selectedQueue, setSelectedQueue] = useState<ExternalQueue | null>(null);
  const [selectedSubItem, setSelectedSubItem] = useState<SubItem | null>(null);

  // Internal 2-level (category → services)
  const [selectedCategory, setSelectedCategory] = useState<Category | "other" | null>(null);

  // Auto-reset to menu after showing ticket (no need to click "Get another ticket")
  const TICKET_DISPLAY_MS = 6000;
  useEffect(() => {
    if (!selectedTicket) return;
    const t = setTimeout(() => {
      setSelectedTicket(null);
      setExternalLevel(0);
      setSelectedQueue(null);
      setSelectedSubItem(null);
      setSelectedCategory(null);
    }, TICKET_DISPLAY_MS);
    return () => clearTimeout(t);
  }, [selectedTicket]);

  useEffect(() => {
    async function load() {
      try {
        const extRes = await fetch("/api/external/content");
        const extData: ExternalContent | null = extRes.ok ? await extRes.json() : null;
        if (extData?.queues?.length && Array.isArray(extData.queues)) {
          const sorted = [...extData.queues].sort(
            (a, b) => (a.position ?? 0) - (b.position ?? 0)
          );
          setExternalContent({ ...extData, queues: sorted });
          setUseExternal(true);
          setLoading(false);
          return;
        }
      } catch {
        /* fall through to internal */
      }
      setUseExternal(false);
      try {
        const [cats, allServices] = await Promise.all([
          fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/services").then((r) => (r.ok ? r.json() : [])),
        ]);
        setCategories(Array.isArray(cats) ? cats : []);
        setUncategorizedServices(
          Array.isArray(allServices) ? allServices.filter((s: Service & { categoryId?: string | null }) => !s.categoryId) : []
        );
      } catch {
        setError("Failed to load menu");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function takeTicketWithLabel(queueLabel: string) {
    setSubmitting(queueLabel);
    setError(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueLabel }),
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

  async function takeTicketWithServiceId(serviceId: string) {
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

  function handleExternalLeaf(path: string) {
    takeTicketWithLabel(path);
    setExternalLevel(0);
    setSelectedQueue(null);
    setSelectedSubItem(null);
  }

  const externalQueues = externalContent?.queues ?? [];
  const sortedSubItems = selectedQueue?.subItems
    ? [...selectedQueue.subItems].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    : [];
  const sortedSubSubItems = selectedSubItem?.subSubItems
    ? [...selectedSubItem.subSubItems].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    : [];

  const categoriesWithQueues = categories.filter((c) => c.services?.length > 0);
  const hasOther = uncategorizedServices.length > 0;
  const hasInternalMenu = categoriesWithQueues.length > 0 || hasOther;
  const currentInternalQueues =
    selectedCategory === null
      ? []
      : selectedCategory === "other"
        ? uncategorizedServices
        : selectedCategory?.services ?? [];
  const currentCategoryName =
    selectedCategory === null
      ? ""
      : selectedCategory === "other"
        ? "Other services"
        : selectedCategory?.name ?? "";

  // ——— Ticket result screen (shared) ———
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

  // ——— External content: logo + 3-level queues ———
  if (useExternal && externalContent) {
    const logoUrl = externalContent.logo?.url;
    return (
      <div className="flex min-h-screen flex-col bg-muted/40 p-4 sm:p-6">
        <div className="mx-auto w-full max-w-3xl flex-1 flex flex-col">
          {logoUrl && (
            <div className="mb-6 flex justify-center">
              <img
                src={logoUrl}
                alt=""
                className="max-h-20 w-auto object-contain"
              />
            </div>
          )}

          {externalLevel > 0 && (
            <Button
              variant="ghost"
              className="-ml-2 mb-4 h-11 gap-2 self-start text-muted-foreground hover:text-foreground"
              onClick={() => {
                if (externalLevel === 1) {
                  setExternalLevel(0);
                  setSelectedQueue(null);
                } else {
                  setExternalLevel(1);
                  setSelectedSubItem(null);
                }
              }}
              aria-label="Back"
            >
              <ChevronLeft className="size-5" />
              Back
            </Button>
          )}

          <Card className="flex-1 border-2 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                {externalLevel === 0 && "Select a category"}
                {externalLevel === 1 && selectedQueue?.title}
                {externalLevel === 2 && selectedSubItem?.title}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {externalLevel === 2 && sortedSubSubItems.length === 0
                  ? "Tap below to get your ticket"
                  : "Tap an option to continue or get your ticket"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {error && (
                <p
                  className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}

              {externalLevel === 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {externalQueues.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setSelectedQueue(q);
                        setSelectedSubItem(null);
                        setExternalLevel(1);
                      }}
                      className="flex min-h-[88px] items-center justify-between gap-4 rounded-xl border-2 border-border bg-card px-5 py-4 text-left shadow-sm transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Open ${q.title}`}
                    >
                      <span className="font-semibold text-foreground text-lg">
                        {q.title}
                      </span>
                      <ChevronRight className="size-6 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {externalLevel === 1 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {sortedSubItems.map((sub) => {
                    const hasSubSub = sub.subSubItems && sub.subSubItems.length > 0;
                    const pathSoFar = `${selectedQueue!.title} - ${sub.title}`;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          if (hasSubSub) {
                            setSelectedSubItem(sub);
                            setExternalLevel(2);
                          } else {
                            handleExternalLeaf(pathSoFar);
                          }
                        }}
                        disabled={!!submitting}
                        className="flex min-h-[88px] items-center justify-between gap-4 rounded-xl border-2 border-border bg-card px-5 py-4 text-left shadow-sm transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
                        aria-label={hasSubSub ? `Open ${sub.title}` : `Get ticket for ${pathSoFar}`}
                      >
                        <span className="font-semibold text-foreground text-lg">
                          {sub.title}
                        </span>
                        {hasSubSub ? (
                          <ChevronRight className="size-6 shrink-0 text-muted-foreground" />
                        ) : submitting === pathSoFar ? (
                          <span className="text-muted-foreground text-xs">
                            Please wait…
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}

              {externalLevel === 2 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {sortedSubSubItems.length > 0 ? (
                    sortedSubSubItems.map((subSub) => {
                      const path = `${selectedQueue!.title} - ${selectedSubItem!.title} - ${subSub.title}`;
                      return (
                        <Button
                          key={subSub.id}
                          size="lg"
                          variant="outline"
                          className="h-auto min-h-[88px] flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 py-5 text-base"
                          onClick={() => handleExternalLeaf(path)}
                          disabled={!!submitting}
                          aria-label={`Get ticket for ${path}`}
                        >
                          <span className="font-semibold">{subSub.title}</span>
                          {submitting === path && (
                            <span className="text-muted-foreground text-xs">
                              Please wait…
                            </span>
                          )}
                        </Button>
                      );
                    })
                  ) : (
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-auto min-h-[88px] rounded-xl border-2"
                      onClick={() =>
                        handleExternalLeaf(
                          `${selectedQueue!.title} - ${selectedSubItem!.title}`
                        )
                      }
                      disabled={!!submitting}
                      aria-label={`Get ticket for ${selectedQueue!.title} - ${selectedSubItem!.title}`}
                    >
                      {submitting ? "Please wait…" : "Get ticket"}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ——— Internal: categories → queues (existing flow) ———
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
                <p
                  className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {currentInternalQueues.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No queues in this category right now.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {currentInternalQueues.map((s) => (
                    <Button
                      key={s.id}
                      size="lg"
                      variant="outline"
                      className="h-auto min-h-[88px] flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 py-5 text-base transition-colors hover:border-primary hover:bg-primary/5"
                      onClick={() => takeTicketWithServiceId(s.id)}
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
                        <span className="text-muted-foreground text-xs">
                          Please wait…
                        </span>
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

  // ——— Internal: category list (initial) ———
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
              <p className="py-12 text-center text-muted-foreground">
                Loading…
              </p>
            )}
            {error && (
              <p
                className="rounded-lg bg-destructive/10 px-4 py-3 text-center text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}
            {!loading && !hasInternalMenu && (
              <p className="py-12 text-center text-muted-foreground">
                No queues available at the moment. Please try again later.
              </p>
            )}
            {!loading && hasInternalMenu && (
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
