"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const POLL_INTERVAL_MS = 4000;
const AUDIO_BASE = "/audio";
const ANNOUNCE_REPEAT_COUNT = 2;

type DisplayTicket = {
  ticketNumber: string;
  tillNumber: number;
  serviceName: string;
  status: string;
  callCount?: number;
};

/** All audio filenames we preload (digits, letters A–F, ticketnumber, tocounter). */
const PRELOAD_FILES = [
  "ticketnumber.mp3",
  "tocounter.mp3",
  ...["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => `${d}.mp3`),
  ...["A", "B", "C", "D", "E", "F"].map((l) => `${l}.mp3`),
];

/** Build list of audio file paths for announcing "Ticket X to counter Y". */
function getAnnouncementUrls(ticketNumber: string, tillNumber: number): string[] {
  const urls: string[] = [`${AUDIO_BASE}/ticketnumber.mp3`];
  for (const char of ticketNumber.toUpperCase()) {
    urls.push(`${AUDIO_BASE}/${char}.mp3`);
  }
  urls.push(`${AUDIO_BASE}/tocounter.mp3`);
  for (const char of String(tillNumber)) {
    urls.push(`${AUDIO_BASE}/${char}.mp3`);
  }
  return urls;
}

/** Play one URL using preloaded Audio or create on demand; returns promise that resolves when ended. */
function playOneUrl(
  url: string,
  preloadedMap: Map<string, HTMLAudioElement>
): Promise<void> {
  return new Promise((resolve) => {
    let audio = preloadedMap.get(url);
    if (!audio) {
      audio = new Audio(url);
    }
    const onDone = () => {
      audio!.onended = null;
      audio!.onerror = null;
      resolve();
    };
    audio.onended = onDone;
    audio.onerror = onDone;
    audio.currentTime = 0;
    audio.play().catch(onDone);
  });
}

/** Play a sequence of URLs one after another using preloaded audio when available. */
function playSequence(
  urls: string[],
  preloadedMap: Map<string, HTMLAudioElement>
): Promise<void> {
  return urls.reduce(
    (p, url) => p.then(() => playOneUrl(url, preloadedMap)),
    Promise.resolve()
  );
}

export default function DisplayPage() {
  const [tickets, setTickets] = useState<DisplayTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const announcedRef = useRef<Set<string>>(new Set());
  const lastCallCountRef = useRef<Map<string, number>>(new Map());
  const announcementQueueRef = useRef<Promise<void>>(Promise.resolve());
  const preloadedAudioRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const map = preloadedAudioRef.current;
    const base = AUDIO_BASE.startsWith("/") ? "" : "";
    let loaded = 0;
    const total = PRELOAD_FILES.length;
    const checkReady = () => {
      loaded++;
      if (loaded >= total) setAudioReady(true);
    };
    PRELOAD_FILES.forEach((file) => {
      const url = `${base}${AUDIO_BASE}/${file}`;
      const audio = new Audio();
      audio.preload = "auto";
      audio.oncanplaythrough = checkReady;
      audio.onerror = checkReady;
      audio.src = url;
      audio.load();
      map.set(url, audio);
    });
  }, []);

  const fetchDisplay = useCallback(async () => {
    try {
      const res = await fetch("/api/display");
      if (!res.ok) {
        setError("Failed to load display");
        return;
      }
      const data = await res.json();
      const nextTickets: DisplayTicket[] = data.tickets ?? [];
      setTickets(nextTickets);
      setError(null);

      const announced = announcedRef.current;
      const lastCallCount = lastCallCountRef.current;
      const preloadedMap = preloadedAudioRef.current;
      const toAnnounce: DisplayTicket[] = [];

      for (const t of nextTickets) {
        const key = `${t.ticketNumber}|${t.tillNumber}`;
        const callCount = t.callCount ?? 0;
        const prevCallCount = lastCallCount.get(key) ?? 0;

        if (!announced.has(key)) {
          announced.add(key);
          lastCallCount.set(key, callCount);
          toAnnounce.push(t);
        } else if (callCount > prevCallCount) {
          lastCallCount.set(key, callCount);
          toAnnounce.push(t);
        }
      }

      if (toAnnounce.length > 0) {
        const run = () => {
          announcementQueueRef.current = announcementQueueRef.current.then(
            async () => {
              for (const t of toAnnounce) {
                const urls = getAnnouncementUrls(t.ticketNumber, t.tillNumber);
                for (let r = 0; r < ANNOUNCE_REPEAT_COUNT; r++) {
                  await playSequence(urls, preloadedMap);
                }
              }
            }
          );
        };
        run();
      }
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
