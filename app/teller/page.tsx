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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const POLL_INTERVAL_MS = 4000;

type QueueData = {
  tillNumber: number;
  branchId?: string;
  branchName?: string | null;
  serviceId: string | null;
  serviceName: string | null;
  stats: {
    waiting: number;
    called: number;
    serving: number;
    held: number;
    noShow: number;
  };
  waitingByService: {
    serviceId: string;
    name: string;
    slug: string;
    count: number;
  }[];
  services: { id: string; name: string; slug: string }[];
  currentTicket: {
    id: string;
    ticketNumber: string;
    status: string;
    serviceName: string;
    phoneNumber: string | null;
    callCount: number;
    transactions: { id: string; label: string; completedAt: string | null }[];
  } | null;
};

type PerformanceData = {
  averageServingTimeMs: number | null;
  totalBreaksToday: number;
  onBreak: boolean;
  peakProductivityHour: { hour: number; completedCount: number } | null;
  contribution: {
    completed: number;
    noShow: number;
    totalHandled: number;
  };
  history: {
    id: string;
    ticketNumber: string;
    queueLabel: string;
    status: string;
    completedAt: string | null;
    durationMs: number | null;
  }[];
};

type RedirectTarget = { id: string; tillNumber: number; name: string | null };

function formatDurationMs(ms: number | null): string {
  if (ms == null) return "—";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 1) return `${m}m ${r}s`;
  return `${s}s`;
}

function formatHour(h: number): string {
  const am = h < 12;
  const hr = h % 12 || 12;
  return `${hr}:00 ${am ? "a.m." : "p.m."}`;
}

export default function TellerDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<QueueData | null>(null);
  const [perf, setPerf] = useState<PerformanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newTransactionLabel, setNewTransactionLabel] = useState("");
  const [changingService, setChangingService] = useState(false);
  const [redirectOpen, setRedirectOpen] = useState(false);
  const [redirectTargets, setRedirectTargets] = useState<RedirectTarget[]>(
    []
  );
  const [breakLoading, setBreakLoading] = useState(false);

  const refreshAll = useCallback(async () => {
    const [qRes, pRes] = await Promise.all([
      fetch("/api/teller/queue"),
      fetch("/api/teller/performance"),
    ]);
    if (qRes.status === 401) {
      router.push("/teller/login");
      return;
    }
    if (!qRes.ok) {
      setError("Failed to load queue");
      return;
    }
    const json = await qRes.json();
    setData(json);
    setError(null);
    if (pRes.ok) {
      setPerf(await pRes.json());
    }
  }, [router]);

  useEffect(() => {
    refreshAll();
    const id = setInterval(refreshAll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshAll]);

  async function callNext() {
    setActionLoading("next");
    try {
      const res = await fetch("/api/tickets/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.status === 401) {
        router.push("/teller/login");
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to call next");
        return;
      }
      await refreshAll();
    } finally {
      setActionLoading(null);
    }
  }

  async function ticketAction(
    ticketId: string,
    action: string,
    extra?: Record<string, string>
  ) {
    setActionLoading(`${ticketId}-${action}`);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.status === 401) {
        router.push("/teller/login");
        return;
      }
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Action failed");
        return;
      }
      setRedirectOpen(false);
      await refreshAll();
    } finally {
      setActionLoading(null);
    }
  }

  async function addTransaction(ticketId: string) {
    if (!newTransactionLabel.trim()) return;
    setActionLoading(`${ticketId}-addTx`);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newTransactionLabel.trim() }),
      });
      if (res.status === 401) {
        router.push("/teller/login");
        return;
      }
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to add transaction");
        return;
      }
      setNewTransactionLabel("");
      await refreshAll();
    } finally {
      setActionLoading(null);
    }
  }

  async function changeService(newServiceId: string) {
    if (!newServiceId) return;
    setChangingService(true);
    try {
      const res = await fetch("/api/auth/teller/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: newServiceId }),
      });
      if (!res.ok) return;
      await refreshAll();
    } finally {
      setChangingService(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/teller/logout", { method: "POST" });
    router.push("/teller/login");
    router.refresh();
  }

  async function openRedirectDialog() {
    const res = await fetch("/api/teller/redirect-targets");
    if (res.ok) {
      const j = await res.json();
      setRedirectTargets(j.targets ?? []);
    } else {
      setRedirectTargets([]);
    }
    setRedirectOpen(true);
  }

  async function breakAction(action: "start" | "end") {
    setBreakLoading(true);
    try {
      const res = await fetch("/api/teller/breaks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Break action failed");
        return;
      }
      await refreshAll();
    } finally {
      setBreakLoading(false);
    }
  }

  if (!data) {
    return (
      <div className="flex h-dvh items-center justify-center p-6">
        <div className="glass-panel-strong rounded-2xl px-10 py-8">
          <p className="text-muted-foreground">{error || "Loading…"}</p>
        </div>
      </div>
    );
  }

  const contribution = perf?.contribution;
  const contributionLabel =
    contribution && contribution.totalHandled > 0
      ? `Served ${contribution.completed} of ${contribution.totalHandled} (${contribution.noShow} no-show)`
      : contribution
        ? `Served ${contribution.completed} (no terminal tickets yet today)`
        : "—";

  return (
    <div className="flex h-dvh flex-col gap-2 overflow-hidden p-3 sm:gap-3 sm:p-4">
      <header className="glass-panel-strong flex shrink-0 flex-col gap-2 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/logo.png"
            alt="Company logo"
            width={200}
            height={91}
            className="h-11 w-auto shrink-0 object-contain"
            priority
          />
          <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Teller
          </p>
          <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">
            Till {data.tillNumber}
            {data.branchName ? (
              <span className="font-normal text-foreground/70"> · {data.branchName}</span>
            ) : null}
          </h1>
          {data.services.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Label
                htmlFor="change-service"
                className="text-xs text-muted-foreground sm:text-sm"
              >
                Serving:
              </Label>
              <select
                id="change-service"
                value={data.serviceId ?? ""}
                onChange={(e) => changeService(e.target.value)}
                disabled={changingService}
                className="h-8 max-w-full rounded-lg border border-white/12 bg-card/40 px-2 text-xs text-foreground shadow-xs backdrop-blur-md sm:text-sm"
              >
                <option value="" disabled>
                  Select a queue
                </option>
                {data.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {perf?.onBreak ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={breakLoading}
              onClick={() => breakAction("end")}
            >
              {breakLoading ? "…" : "End break"}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={
                breakLoading || data.currentTicket?.status === "serving"
              }
              onClick={() => breakAction("start")}
              title={
                data.currentTicket?.status === "serving"
                  ? "Hold or complete your ticket before a break"
                  : undefined
              }
            >
              {breakLoading ? "…" : "Start break"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={logout}>
            Log out
          </Button>
        </div>
      </header>

      {error && (
        <p className="shrink-0 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-3 lg:gap-4">
          <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto">
            <Card className="shrink-0 py-4">
              <CardHeader className="space-y-1 px-4 pb-2 pt-0">
                <CardTitle className="text-base">Queue stats</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 px-4 pb-0 pt-0">
                {(
                  [
                    ["Waiting", data.stats.waiting],
                    ["Called", data.stats.called],
                    ["Serving", data.stats.serving],
                    ["Held", data.stats.held],
                    ["No show", data.stats.noShow],
                  ] as const
                ).map(([label, n]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-white/10 bg-card/30 px-3 py-1.5"
                  >
                    <span className="text-muted-foreground text-xs">
                      {label}
                    </span>
                    <p className="text-lg font-semibold tabular-nums leading-tight">
                      {n}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shrink-0 py-4">
              <CardHeader className="space-y-0 px-4 pb-2 pt-0">
                <CardTitle className="text-base">Call next</CardTitle>
                <CardDescription className="text-xs">
                  {data.serviceName
                    ? `Next waiting in ${data.serviceName}`
                    : "Next waiting"}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-0 pt-0">
                <Button
                  className="w-full"
                  onClick={() => callNext()}
                  disabled={
                    data.stats.waiting === 0 || actionLoading === "next"
                  }
                >
                  {actionLoading === "next" ? "Calling…" : "Call next"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden py-4">
              <CardHeader className="shrink-0 space-y-0 px-4 pb-2 pt-0">
                <CardTitle className="text-base">Current ticket</CardTitle>
                <CardDescription className="text-xs">
                  {data.currentTicket
                    ? `${data.currentTicket.ticketNumber} · ${data.currentTicket.serviceName}`
                    : "None — use Call next"}
                </CardDescription>
                {data.currentTicket?.phoneNumber && (
                  <p className="text-xs text-muted-foreground">
                    Phone: {data.currentTicket.phoneNumber}
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-2 pt-0">
              {data.currentTicket && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {(data.currentTicket.status === "serving" ||
                      data.currentTicket.status === "called") && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            ticketAction(data.currentTicket!.id, "hold")
                          }
                          disabled={!!actionLoading}
                        >
                          Hold
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            ticketAction(data.currentTicket!.id, "callAgain")
                          }
                          disabled={!!actionLoading}
                        >
                          Call again
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            ticketAction(data.currentTicket!.id, "complete")
                          }
                          disabled={!!actionLoading}
                        >
                          Complete
                        </Button>
                      </>
                    )}
                    {data.currentTicket.status === "held" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            ticketAction(data.currentTicket!.id, "resume")
                          }
                          disabled={!!actionLoading}
                        >
                          Resume
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            ticketAction(data.currentTicket!.id, "callAgain")
                          }
                          disabled={!!actionLoading}
                        >
                          Call again
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            ticketAction(data.currentTicket!.id, "complete")
                          }
                          disabled={!!actionLoading}
                        >
                          Complete
                        </Button>
                      </>
                    )}
                    {(data.currentTicket.status === "serving" ||
                      data.currentTicket.status === "held") && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            ticketAction(data.currentTicket!.id, "noShow")
                          }
                          disabled={!!actionLoading}
                        >
                          No show
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openRedirectDialog}
                          disabled={!!actionLoading}
                        >
                          Redirect to…
                        </Button>
                      </>
                    )}
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs text-muted-foreground">
                      Transactions
                    </Label>
                    <ul className="mb-2 list-inside list-disc text-xs">
                      {data.currentTicket.transactions.map((tx) => (
                        <li key={tx.id}>
                          {tx.label}
                          {tx.completedAt ? " ✓" : ""}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        placeholder="e.g. Deposit"
                        value={newTransactionLabel}
                        onChange={(e) => setNewTransactionLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTransaction(data.currentTicket!.id);
                          }
                        }}
                        className="max-w-[200px]"
                        aria-label="New transaction label"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          addTransaction(data.currentTicket!.id)
                        }
                        disabled={
                          !newTransactionLabel.trim() || !!actionLoading
                        }
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </>
              )}
              {!data.currentTicket && data.stats.waiting > 0 && (
                <p className="text-muted-foreground text-xs">
                  No active ticket. Tap Call next.
                </p>
              )}
              </CardContent>
            </Card>
          </div>

          {/* Column 3: Your performance */}
          <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto">
            <Card className="py-4">
              <CardHeader className="space-y-0 px-4 pb-2 pt-0">
                <CardTitle className="text-base">Your performance</CardTitle>
                <CardDescription className="text-xs">Today</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-0 pt-0 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">
                    Avg. serving time
                  </p>
                  <p className="font-medium">
                    {formatDurationMs(perf?.averageServingTimeMs ?? null)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    Breaks finished
                  </p>
                  <p className="font-medium">
                    {perf?.totalBreaksToday ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    Peak hour (completions)
                  </p>
                  <p className="font-medium">
                    {perf?.peakProductivityHour
                      ? `${formatHour(perf.peakProductivityHour.hour)} · ${perf.peakProductivityHour.completedCount} ticket(s)`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Contribution</p>
                  <p className="font-medium leading-snug">
                    {contributionLabel}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Card className="flex min-h-0 shrink-0 basis-[32vh] flex-col overflow-hidden py-3 sm:basis-[30vh]">
        <CardHeader className="shrink-0 space-y-0 px-4 py-2">
          <CardTitle className="text-sm">Ticket history (today)</CardTitle>
        </CardHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
          {!perf?.history?.length ? (
            <p className="text-muted-foreground text-xs">No completed tickets yet.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-card/80 backdrop-blur-sm">
                <tr className="border-b border-white/10">
                  <th className="py-1.5 pr-2 font-medium">Ticket</th>
                  <th className="py-1.5 pr-2 font-medium">Service</th>
                  <th className="py-1.5 pr-2 font-medium">Status</th>
                  <th className="py-1.5 pr-2 font-medium">Time</th>
                  <th className="py-1.5 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {perf.history.map((h) => (
                  <tr
                    key={h.id}
                    className="border-b border-white/5 text-muted-foreground"
                  >
                    <td className="py-1.5 pr-2 font-medium text-foreground">
                      {h.ticketNumber}
                    </td>
                    <td className="max-w-[140px] truncate py-1.5 pr-2">
                      {h.queueLabel}
                    </td>
                    <td className="py-1.5 pr-2 capitalize">
                      {h.status.replace("_", " ")}
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums">
                      {h.completedAt
                        ? new Date(h.completedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="py-1.5 tabular-nums">
                      {formatDurationMs(h.durationMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Dialog open={redirectOpen} onOpenChange={setRedirectOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redirect to till</DialogTitle>
            <DialogDescription>
              Send this ticket to another till. They must have no active
              customer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            {redirectTargets.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No other tills available.
              </p>
            ) : (
              redirectTargets.map((t) => (
                <Button
                  key={t.id}
                  variant="outline"
                  className="h-auto justify-start py-3 text-left"
                  disabled={!!actionLoading}
                  onClick={() =>
                    data.currentTicket &&
                    ticketAction(data.currentTicket.id, "redirect", {
                      targetTellerId: t.id,
                    })
                  }
                >
                  <span className="font-semibold">Till {t.tillNumber}</span>
                  {t.name && (
                    <span className="text-muted-foreground ml-2 text-sm font-normal">
                      {t.name}
                    </span>
                  )}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
