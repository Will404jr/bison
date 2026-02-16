"use client";

import { useState, useEffect, useCallback } from "react";

const POLL_INTERVAL_MS = 4000;

type DisplayTicket = {
  ticketNumber: string;
  tillNumber: number;
  serviceName: string;
  status: string;
};

export default function DisplayPage() {
  const [tickets, setTickets] = useState<DisplayTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDisplay = useCallback(async () => {
    try {
      const res = await fetch("/api/display");
      if (!res.ok) {
        setError("Failed to load display");
        return;
      }
      const data = await res.json();
      setTickets(data.tickets ?? []);
      setError(null);
    } catch {
      setError("Failed to load display");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisplay();
    const id = setInterval(fetchDisplay, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchDisplay]);

  if (loading && tickets.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
        <p className="text-xl">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 p-8 text-white">
      <h1 className="mb-8 text-center text-3xl font-bold tracking-tight">
        Now serving
      </h1>
      {error && (
        <p className="text-center text-red-400" role="alert">
          {error}
        </p>
      )}
      <div
        className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3"
        aria-live="polite"
        aria-atomic="true"
      >
        {tickets.length === 0 ? (
          <p className="col-span-full text-center text-xl text-zinc-500">
            No tickets currently being served
          </p>
        ) : (
          tickets.map((t) => (
            <div
              key={`${t.ticketNumber}-${t.tillNumber}`}
              className="flex flex-col items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/50 py-8 shadow-lg"
            >
              <span className="text-4xl font-bold tracking-tight text-white">
                {t.ticketNumber}
              </span>
              <span className="mt-2 text-xl text-zinc-300">
                Till {t.tillNumber}
              </span>
              <span className="mt-1 text-sm text-zinc-500">
                {t.serviceName}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
