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

/** Full-width touch row for kiosk menus (vertical list). */
const kioskMenuButtonClass =
  "flex w-full min-h-[min(22vh,11rem)] items-center justify-between gap-6 rounded-2xl border-2 border-border bg-card/90 px-8 py-6 text-left text-xl font-semibold shadow-md backdrop-blur-sm transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.995] sm:min-h-[9.5rem] sm:px-10 sm:text-2xl";

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
      <div className="flex min-h-dvh flex-col">
        <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10">
          <Card className="w-full max-w-2xl border-2 shadow-lg">
            <CardHeader className="space-y-2 pb-2 text-center">
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/15 text-primary sm:size-24">
                <Ticket className="size-10 sm:size-12" aria-hidden />
              </div>
              <CardTitle className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Your ticket
              </CardTitle>
              <CardDescription className="text-lg sm:text-xl">
                Wait for your number to be called at the display
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-8 pb-10 pt-4">
              <div
                className="rounded-2xl bg-primary px-12 py-8 text-6xl font-bold tracking-tight text-primary-foreground shadow-lg sm:text-7xl"
                aria-live="polite"
              >
                {selectedTicket.ticketNumber}
              </div>
              {selectedTicket.waitingAhead > 0 && (
                <p className="text-center text-lg text-muted-foreground">
                  Approximately {selectedTicket.waitingAhead} people ahead of you
                </p>
              )}
              <Button
                size="lg"
                onClick={() => setSelectedTicket(null)}
                className="h-16 w-full max-w-md text-xl"
              >
                Get another ticket
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ——— External content: logo + 3-level queues ———
  if (useExternal && externalContent) {
    const logoUrl = externalContent.logo?.url;
    return (
      <div className="flex min-h-dvh flex-col">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-6 sm:p-10">
          {logoUrl && (
            <div className="mb-8 flex justify-center">
              <img
                src={logoUrl}
                alt=""
                className="max-h-24 w-auto object-contain sm:max-h-28"
              />
            </div>
          )}

          {externalLevel > 0 && (
            <Button
              variant="ghost"
              className="mb-6 h-14 gap-3 self-start px-4 text-lg text-muted-foreground hover:text-foreground sm:h-16 sm:text-xl"
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
              <ChevronLeft className="size-7 sm:size-8" />
              Back
            </Button>
          )}

          <Card className="flex-1 border-2 shadow-lg">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {externalLevel === 0 && "Select a category"}
                {externalLevel === 1 && selectedQueue?.title}
                {externalLevel === 2 && selectedSubItem?.title}
              </CardTitle>
              <CardDescription className="text-base sm:text-lg">
                {externalLevel === 2 && sortedSubSubItems.length === 0
                  ? "Tap below to get your ticket"
                  : "Tap an option to continue or get your ticket"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:gap-5">
              {error && (
                <p
                  className="rounded-xl bg-destructive/10 px-5 py-3 text-base text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}

              {externalLevel === 0 && (
                <div className="flex flex-col gap-4 sm:gap-5">
                  {externalQueues.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setSelectedQueue(q);
                        setSelectedSubItem(null);
                        setExternalLevel(1);
                      }}
                      className={kioskMenuButtonClass}
                      aria-label={`Open ${q.title}`}
                    >
                      <span className="text-foreground">{q.title}</span>
                      <ChevronRight className="size-8 shrink-0 text-muted-foreground sm:size-10" />
                    </button>
                  ))}
                </div>
              )}

              {externalLevel === 1 && (
                <div className="flex flex-col gap-4 sm:gap-5">
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
                        className={`${kioskMenuButtonClass} disabled:opacity-70`}
                        aria-label={hasSubSub ? `Open ${sub.title}` : `Get ticket for ${pathSoFar}`}
                      >
                        <span className="text-foreground">{sub.title}</span>
                        {hasSubSub ? (
                          <ChevronRight className="size-8 shrink-0 text-muted-foreground sm:size-10" />
                        ) : submitting === pathSoFar ? (
                          <span className="text-muted-foreground text-lg">
                            Please wait…
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}

              {externalLevel === 2 && (
                <div className="flex flex-col gap-4 sm:gap-5">
                  {sortedSubSubItems.length > 0 ? (
                    sortedSubSubItems.map((subSub) => {
                      const path = `${selectedQueue!.title} - ${selectedSubItem!.title} - ${subSub.title}`;
                      return (
                        <Button
                          key={subSub.id}
                          size="lg"
                          variant="outline"
                          className={`${kioskMenuButtonClass} h-auto min-h-[min(22vh,11rem)] flex-col justify-center gap-2 text-center sm:min-h-[9.5rem]`}
                          onClick={() => handleExternalLeaf(path)}
                          disabled={!!submitting}
                          aria-label={`Get ticket for ${path}`}
                        >
                          <span>{subSub.title}</span>
                          {submitting === path && (
                            <span className="text-muted-foreground text-base font-normal">
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
                      className={kioskMenuButtonClass}
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
      <div className="flex min-h-dvh flex-col">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-6 sm:p-10">
          <Button
            variant="ghost"
            className="mb-6 h-14 gap-3 self-start px-4 text-lg text-muted-foreground hover:text-foreground sm:h-16 sm:text-xl"
            onClick={() => setSelectedCategory(null)}
            aria-label="Back to categories"
          >
            <ChevronLeft className="size-7 sm:size-8" />
            Back to categories
          </Button>
          <Card className="flex-1 border-2 shadow-lg">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {currentCategoryName}
              </CardTitle>
              <CardDescription className="text-base sm:text-lg">
                Tap a queue to get your ticket number
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:gap-5">
              {error && (
                <p
                  className="rounded-xl bg-destructive/10 px-5 py-3 text-base text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {currentInternalQueues.length === 0 ? (
                <p className="py-12 text-center text-lg text-muted-foreground">
                  No queues in this category right now.
                </p>
              ) : (
                currentInternalQueues.map((s) => (
                  <Button
                    key={s.id}
                    size="lg"
                    variant="outline"
                    className="h-auto min-h-[min(22vh,11rem)] w-full flex-col justify-center gap-2 rounded-2xl border-2 py-6 text-xl font-semibold hover:border-primary hover:bg-primary/10 sm:min-h-[9.5rem] sm:text-2xl"
                    onClick={() => takeTicketWithServiceId(s.id)}
                    disabled={!!submitting}
                    aria-label={`Get ticket for ${s.name}`}
                  >
                    <span>{s.name}</span>
                    {s.description && (
                      <span className="max-w-full px-4 text-center text-base font-normal leading-snug text-muted-foreground sm:text-lg">
                        {s.description}
                      </span>
                    )}
                    {submitting === s.id && (
                      <span className="text-base text-muted-foreground">
                        Please wait…
                      </span>
                    )}
                  </Button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ——— Internal: category list (initial) ———
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center p-6 sm:p-10">
        <Card className="border-2 shadow-lg">
          <CardHeader className="space-y-2 pb-8 text-center sm:pb-10">
            <CardTitle className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Select a category
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground sm:text-xl">
              Choose a category to see available queues and get your ticket
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pb-8 sm:gap-5 sm:pb-10">
            {loading && (
              <p className="py-16 text-center text-xl text-muted-foreground">
                Loading…
              </p>
            )}
            {error && (
              <p
                className="rounded-xl bg-destructive/10 px-5 py-4 text-center text-lg text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}
            {!loading && !hasInternalMenu && (
              <p className="py-16 text-center text-lg text-muted-foreground">
                No queues available at the moment. Please try again later.
              </p>
            )}
            {!loading && hasInternalMenu && (
              <>
                {categoriesWithQueues.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={kioskMenuButtonClass}
                    aria-label={`Open ${category.name} queues`}
                  >
                    <span className="text-foreground">{category.name}</span>
                    <ChevronRight className="size-8 shrink-0 text-muted-foreground sm:size-10" />
                  </button>
                ))}
                {hasOther && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("other")}
                    className={kioskMenuButtonClass}
                    aria-label="Open other services queues"
                  >
                    <span className="text-foreground">Other services</span>
                    <ChevronRight className="size-8 shrink-0 text-muted-foreground sm:size-10" />
                  </button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
