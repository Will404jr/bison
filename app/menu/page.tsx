"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Ticket, User } from "lucide-react";

type ExternalQueue = {
  id: string;
  title: string;
  url: string | null;
  position: number;
};

type ExternalContent = {
  logo?: { url?: string };
  queues?: ExternalQueue[];
};

type Service = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

const kioskMenuButtonClass =
  "glass-panel flex w-full min-h-[min(22vh,11rem)] items-center justify-between gap-6 rounded-2xl border-2 border-border px-8 py-6 text-left text-xl font-semibold shadow-md transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.995] sm:min-h-[9.5rem] sm:px-10 sm:text-2xl";

const TICKET_DISPLAY_MS = 6000;

function validatePhoneInput(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

function KioskNavbar({
  branchName,
  logoError,
  onLogoError,
  onLogout,
}: {
  branchName: string | null;
  logoError: boolean;
  onLogoError: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="glass-panel-strong flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {logoError ? (
          <div className="glass-panel flex size-12 shrink-0 items-center justify-center rounded-lg shadow-none">
            <span className="text-sm font-bold text-primary">QMS</span>
          </div>
        ) : (
          <Image
            src="/logo.png"
            alt="Company logo"
            width={200}
            height={91}
            className="h-11 w-auto shrink-0 object-contain"
            onError={onLogoError}
            priority
          />
        )}
      </div>
      <p className="truncate text-center text-base font-semibold text-foreground/90 sm:text-lg">
        {branchName ?? "Branch"}
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-10 shrink-0 rounded-full"
            aria-label="User menu"
          >
            <User className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {branchName && (
            <>
              <DropdownMenuLabel>{branchName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={onLogout}>
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export default function KioskPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [useExternal, setUseExternal] = useState(false);
  const [externalContent, setExternalContent] = useState<ExternalContent | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  const [selectedTicket, setSelectedTicket] = useState<{
    ticketNumber: string;
    waitingAhead: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const resetForNextCustomer = useCallback(() => {
    setPhoneNumber(null);
    setPhoneInput("");
    setPhoneError(null);
    setSelectedTicket(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!selectedTicket) return;
    const t = setTimeout(resetForNextCustomer, TICKET_DISPLAY_MS);
    return () => clearTimeout(t);
  }, [selectedTicket, resetForNextCustomer]);

  useEffect(() => {
    fetch("/api/auth/branch/me")
      .then((res) => {
        if (!res.ok) {
          router.replace("/menu/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.name) setBranchName(data.name);
      })
      .catch(() => router.replace("/menu/login"))
      .finally(() => setAuthChecked(true));
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
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
        const allServices = await fetch("/api/services").then((r) =>
          r.ok ? r.json() : []
        );
        setServices(Array.isArray(allServices) ? allServices : []);
      } catch {
        setError("Failed to load menu");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authChecked]);

  async function handleLogout() {
    await fetch("/api/auth/branch/logout", { method: "POST" });
    router.replace("/menu/login");
  }

  function handlePhoneContinue(e: React.FormEvent) {
    e.preventDefault();
    const normalized = validatePhoneInput(phoneInput.trim());
    if (!normalized) {
      setPhoneError("Enter a valid phone number (8–15 digits)");
      return;
    }
    setPhoneError(null);
    setPhoneNumber(normalized);
    setError(null);
  }

  async function takeTicketWithLabel(queueLabel: string) {
    if (!phoneNumber) return;
    setSubmitting(queueLabel);
    setError(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueLabel, phoneNumber }),
      });
      if (res.status === 401) {
        router.replace("/menu/login");
        return;
      }
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
    if (!phoneNumber) return;
    setSubmitting(serviceId);
    setError(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, phoneNumber }),
      });
      if (res.status === 401) {
        router.replace("/menu/login");
        return;
      }
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

  const externalQueues = externalContent?.queues ?? [];

  const internalServices: Service[] = services;
  const hasInternalMenu = internalServices.length > 0;

  if (!authChecked) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <p className="text-lg text-muted-foreground">Loading…</p>
      </div>
    );
  }

  function renderPhoneStep() {
    return (
      <div className="flex flex-1 flex-col justify-center py-6 sm:py-10">
        <Card className="border-2 shadow-lg">
          <CardHeader className="space-y-2 pb-6 text-center sm:pb-8">
            <CardTitle className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Enter your phone number
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground sm:text-xl">
              We&apos;ll use this for your queue ticket
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8 sm:pb-10">
            <form onSubmit={handlePhoneContinue} className="mx-auto flex max-w-md flex-col gap-6">
              {phoneError && (
                <p className="text-center text-base text-destructive" role="alert">
                  {phoneError}
                </p>
              )}
              <div className="space-y-3">
                <Label htmlFor="kiosk-phone" className="text-base sm:text-lg">
                  Phone number
                </Label>
                <Input
                  id="kiosk-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phoneInput}
                  onChange={(e) => {
                    setPhoneInput(e.target.value);
                    setPhoneError(null);
                  }}
                  placeholder="e.g. 0700123456"
                  className="h-14 text-xl sm:h-16 sm:text-2xl"
                  required
                />
              </div>
              <Button type="submit" size="lg" className="h-14 text-xl sm:h-16 sm:text-2xl">
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderTicketResult() {
    if (!selectedTicket) return null;
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-6 sm:py-10">
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
              onClick={resetForNextCustomer}
              className="h-16 w-full max-w-md text-xl"
            >
              Get another ticket
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderQueueList() {
    const showExternal = useExternal && !!externalContent;
    const hasQueues = showExternal ? externalQueues.length > 0 : hasInternalMenu;
    return (
      <div className="flex flex-1 flex-col justify-center py-6 sm:py-10">
        <Card className="border-2 shadow-lg">
          <CardHeader className="space-y-2 pb-8 text-center sm:pb-10">
            <CardTitle className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Select a service
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground sm:text-xl">
              Tap a queue to get your ticket number
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pb-8 sm:gap-5 sm:pb-10">
            {loading && (
              <p className="py-16 text-center text-xl text-muted-foreground">Loading…</p>
            )}
            {error && (
              <p
                className="rounded-xl bg-destructive/10 px-5 py-4 text-center text-lg text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}
            {!loading && !hasQueues && (
              <p className="py-16 text-center text-lg text-muted-foreground">
                No queues available at the moment. Please try again later.
              </p>
            )}
            {!loading && hasQueues && showExternal && (
              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                {externalQueues.map((q) => (
                  <Button
                    key={q.id}
                    size="lg"
                    variant="outline"
                    className="h-auto min-h-[min(22vh,11rem)] w-full flex-col justify-center gap-2 whitespace-normal break-words rounded-2xl border-2 px-4 py-6 text-center text-xl font-semibold hover:border-primary hover:bg-primary/10 sm:min-h-[9.5rem] sm:text-2xl"
                    onClick={() => takeTicketWithLabel(q.title)}
                    disabled={!!submitting}
                    aria-label={`Get ticket for ${q.title}`}
                  >
                    <span className="max-w-full break-words">{q.title}</span>
                    {submitting === q.title && (
                      <span className="text-base text-muted-foreground">Please wait…</span>
                    )}
                  </Button>
                ))}
              </div>
            )}
            {!loading && hasQueues && !showExternal && (
              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                {internalServices.map((s) => (
                  <Button
                    key={s.id}
                    size="lg"
                    variant="outline"
                    className="h-auto min-h-[min(22vh,11rem)] w-full flex-col justify-center gap-2 whitespace-normal break-words rounded-2xl border-2 px-4 py-6 text-center text-xl font-semibold hover:border-primary hover:bg-primary/10 sm:min-h-[9.5rem] sm:text-2xl"
                    onClick={() => takeTicketWithServiceId(s.id)}
                    disabled={!!submitting}
                    aria-label={`Get ticket for ${s.name}`}
                  >
                    <span className="max-w-full break-words">{s.name}</span>
                    {s.description && (
                      <span className="max-w-full px-4 text-center text-base font-normal leading-snug text-muted-foreground sm:text-lg">
                        {s.description}
                      </span>
                    )}
                    {submitting === s.id && (
                      <span className="text-base text-muted-foreground">Please wait…</span>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderMainContent() {
    if (selectedTicket) return renderTicketResult();
    if (!phoneNumber) return renderPhoneStep();
    return renderQueueList();
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gradient-to-br from-background via-card/30 to-background">
      <KioskNavbar
        branchName={branchName}
        logoError={logoError}
        onLogoError={() => setLogoError(true)}
        onLogout={handleLogout}
      />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-6 sm:px-10">
          {renderMainContent()}
        </div>
      </main>
    </div>
  );
}
