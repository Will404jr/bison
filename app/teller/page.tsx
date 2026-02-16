"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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

const POLL_INTERVAL_MS = 4000;

type QueueData = {
  tillNumber: number;
  categoryId: string | null;
  categories: { id: string; name: string }[];
  stats: { waiting: number; called: number; serving: number; held: number };
  waitingByService: { serviceId: string; name: string; slug: string; count: number }[];
  services: { id: string; name: string; slug: string }[];
  currentTicket: {
    id: string;
    ticketNumber: string;
    status: string;
    serviceName: string;
    callCount: number;
    transactions: { id: string; label: string; completedAt: string | null }[];
  } | null;
};

export default function TellerDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<QueueData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newTransactionLabel, setNewTransactionLabel] = useState("");
  const [callNextServiceId, setCallNextServiceId] = useState<string>("");
  const [changingCategory, setChangingCategory] = useState(false);

  const fetchQueue = useCallback(async () => {
    const res = await fetch("/api/teller/queue");
    if (res.status === 401) {
      router.push("/teller/login");
      return;
    }
    if (!res.ok) {
      setError("Failed to load queue");
      return;
    }
    const json = await res.json();
    setData(json);
    setError(null);
  }, [router]);

  useEffect(() => {
    fetchQueue();
    const id = setInterval(fetchQueue, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchQueue]);

  async function callNext(serviceId?: string) {
    setActionLoading("next");
    try {
      const res = await fetch("/api/tickets/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceId ? { serviceId } : {}),
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
      setCallNextServiceId("");
      await fetchQueue();
    } finally {
      setActionLoading(null);
    }
  }

  async function ticketAction(ticketId: string, action: string) {
    setActionLoading(`${ticketId}-${action}`);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
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
      await fetchQueue();
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
      await fetchQueue();
    } finally {
      setActionLoading(null);
    }
  }

  async function changeCategory(newCategoryId: string) {
    setChangingCategory(true);
    try {
      const res = await fetch("/api/auth/teller/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: newCategoryId || null }),
      });
      if (!res.ok) return;
      await fetchQueue();
    } finally {
      setChangingCategory(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/teller/logout", { method: "POST" });
    router.push("/teller/login");
    router.refresh();
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">
          {error || "Loading…"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              Till {data.tillNumber} – Queue dashboard
            </h1>
            {data.categories.length > 0 && (
              <div className="mt-1 flex items-center gap-2">
                <Label htmlFor="change-category" className="text-muted-foreground text-sm">
                  Serving:
                </Label>
                <select
                  id="change-category"
                  value={data.categoryId ?? ""}
                  onChange={(e) => changeCategory(e.target.value)}
                  disabled={changingCategory}
                  className="border-input h-8 rounded-md border bg-transparent px-2 text-sm shadow-xs"
                >
                  <option value="">All categories</option>
                  {data.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            Log out
          </Button>
        </div>

        {error && (
          <p className="text-destructive" role="alert">
            {error}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Queue stats</CardTitle>
            <CardDescription>Current queue counts</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <div className="rounded-md border px-4 py-2">
              <span className="text-muted-foreground text-sm">Waiting</span>
              <p className="text-2xl font-semibold">{data.stats.waiting}</p>
            </div>
            <div className="rounded-md border px-4 py-2">
              <span className="text-muted-foreground text-sm">Called</span>
              <p className="text-2xl font-semibold">{data.stats.called}</p>
            </div>
            <div className="rounded-md border px-4 py-2">
              <span className="text-muted-foreground text-sm">Serving</span>
              <p className="text-2xl font-semibold">{data.stats.serving}</p>
            </div>
            <div className="rounded-md border px-4 py-2">
              <span className="text-muted-foreground text-sm">Held</span>
              <p className="text-2xl font-semibold">{data.stats.held}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Call next</CardTitle>
            <CardDescription>
              {data.categoryId
                ? "Call the next ticket in your category (optional: pick a specific service)"
                : "Call the next waiting ticket (optionally by service)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="call-next-service">Service (optional)</Label>
              <select
                id="call-next-service"
                value={callNextServiceId}
                onChange={(e) => setCallNextServiceId(e.target.value)}
                className="border-input h-9 w-full min-w-[180px] rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="">Any</option>
                {data.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => callNext(callNextServiceId || undefined)}
              disabled={
                data.stats.waiting === 0 || actionLoading === "next"
              }
            >
              {actionLoading === "next" ? "Calling…" : "Call next"}
            </Button>
          </CardContent>
        </Card>

        {data.currentTicket && (
          <Card>
            <CardHeader>
              <CardTitle>Current ticket – {data.currentTicket.ticketNumber}</CardTitle>
              <CardDescription>
                {data.currentTicket.serviceName}
                {data.currentTicket.callCount > 0 && (
                  <> · Called again {data.currentTicket.callCount} time(s)</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {data.currentTicket.status === "serving" && (
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
                  <Button
                    size="sm"
                    onClick={() =>
                      ticketAction(data.currentTicket!.id, "resume")
                    }
                    disabled={!!actionLoading}
                  >
                    Resume
                  </Button>
                )}
              </div>

              <div>
                <Label className="text-muted-foreground mb-2 block text-sm">
                  Transactions
                </Label>
                <ul className="mb-2 list-inside list-disc text-sm">
                  {data.currentTicket.transactions.map((tx) => (
                    <li key={tx.id}>
                      {tx.label}
                      {tx.completedAt ? " ✓" : ""}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
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
                    onClick={() => addTransaction(data.currentTicket!.id)}
                    disabled={
                      !newTransactionLabel.trim() ||
                      !!actionLoading
                    }
                  >
                    Add transaction
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!data.currentTicket && data.stats.waiting > 0 && (
          <p className="text-muted-foreground text-sm">
            No ticket currently being served. Use “Call next” to start serving.
          </p>
        )}
      </div>
    </div>
  );
}
