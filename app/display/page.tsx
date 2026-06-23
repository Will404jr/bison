"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const POLL_INTERVAL_MS = 4000;
const AUDIO_BASE = "/audio";
const ANNOUNCE_REPEAT_COUNT = 2;
const PLAYBACK_TIMEOUT_MS = 15000;

type AudioContextConstructor = typeof AudioContext;

function getAudioContextClass(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { webkitAudioContext?: AudioContextConstructor };
  return window.AudioContext ?? w.webkitAudioContext ?? null;
}

type KeepAliveHandle = {
  source: AudioBufferSourceNode;
  gain: GainNode;
};

type ServingTicket = {
  ticketNumber: string;
  tillNumber: number;
  queueLabel: string;
  status: string;
  callCount?: number;
};

type WaitingTicket = {
  ticketNumber: string;
  queueLabel: string;
  status: string;
};

type DisplayData = {
  serving: ServingTicket[];
  held: ServingTicket[];
  waiting: WaitingTicket[];
};

const PRELOAD_FILES = [
  "ticketnumber.mp3",
  "tocounter.mp3",
  ...["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => `${d}.mp3`),
  ...["A", "B", "C", "D", "E", "F"].map((l) => `${l}.mp3`),
];

function audioUrl(file: string): string {
  return `${AUDIO_BASE}/${file}`;
}

async function loadAudioBuffer(
  ctx: AudioContext,
  cache: Map<string, AudioBuffer>,
  url: string
): Promise<AudioBuffer | null> {
  const cached = cache.get(url);
  if (cached) return cached;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    const buffer = await ctx.decodeAudioData(data);
    cache.set(url, buffer);
    return buffer;
  } catch {
    return null;
  }
}

function playAudioBuffer(
  ctx: AudioContext,
  buffer: AudioBuffer,
  destination: AudioNode
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const timer = window.setTimeout(finish, PLAYBACK_TIMEOUT_MS);
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(destination);
      source.onended = () => {
        window.clearTimeout(timer);
        finish();
      };
      source.start(0);
    } catch {
      window.clearTimeout(timer);
      finish();
    }
  });
}

async function ensureAudioRunning(ctx: AudioContext): Promise<boolean> {
  if (ctx.state === "closed") return false;
  if (ctx.state !== "running") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  const state: AudioContextState = ctx.state;
  return state === "running" || state === "interrupted";
}

function startAudioKeepAlive(ctx: AudioContext, destination: AudioNode): KeepAliveHandle {
  const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = 0.001;
  source.connect(gain);
  gain.connect(destination);
  source.start(0);
  return { source, gain };
}

function stopAudioKeepAlive(handle: KeepAliveHandle | null) {
  if (!handle) return;
  try {
    handle.source.stop();
    handle.source.disconnect();
    handle.gain.disconnect();
  } catch {
    // already stopped
  }
}

async function playOneUrl(
  ctx: AudioContext,
  cache: Map<string, AudioBuffer>,
  destination: AudioNode,
  url: string
): Promise<void> {
  const buffer = await loadAudioBuffer(ctx, cache, url);
  if (!buffer) return;
  if (!(await ensureAudioRunning(ctx))) return;
  await playAudioBuffer(ctx, buffer, destination);
}

async function playSequence(
  ctx: AudioContext,
  cache: Map<string, AudioBuffer>,
  destination: AudioNode,
  urls: string[]
): Promise<void> {
  for (const url of urls) {
    await playOneUrl(ctx, cache, destination, url);
  }
}

function getAnnouncementUrls(ticketNumber: string, tillNumber: number): string[] {
  const urls: string[] = [audioUrl("ticketnumber.mp3")];
  for (const char of ticketNumber.toUpperCase()) {
    urls.push(audioUrl(`${char}.mp3`));
  }
  urls.push(audioUrl("tocounter.mp3"));
  for (const char of String(tillNumber)) {
    urls.push(audioUrl(`${char}.mp3`));
  }
  return urls;
}

function SectionHeader({
  title,
  count,
  className,
}: {
  title: string;
  count: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className ?? ""}`}>
      <h2 className="text-xl font-bold uppercase tracking-wider text-primary sm:text-2xl">
        {title}
      </h2>
      <span className="glass-panel rounded-full px-3 py-1 text-sm font-semibold tabular-nums text-foreground shadow-none">
        {count}
      </span>
    </div>
  );
}

function ServingCard({
  ticket,
  size = "large",
}: {
  ticket: ServingTicket;
  size?: "large" | "medium";
}) {
  const isLarge = size === "large";
  return (
    <div
      className={`glass-panel-strong flex flex-col items-center justify-center rounded-2xl px-6 py-5 text-center ${
        isLarge ? "min-h-[10rem]" : "min-h-[8rem] ring-2 ring-amber-400/40"
      }`}
    >
      {!isLarge && (
        <span className="mb-2 rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-200">
          On hold
        </span>
      )}
      <div className="flex items-center gap-3 sm:gap-4">
        <span
          className={`font-bold tabular-nums tracking-tight text-foreground ${
            isLarge ? "text-6xl sm:text-7xl lg:text-8xl" : "text-4xl sm:text-5xl"
          }`}
        >
          {ticket.ticketNumber}
        </span>
        <span
          className={`font-bold text-primary ${isLarge ? "text-4xl sm:text-5xl lg:text-6xl" : "text-3xl sm:text-4xl"}`}
        >
          →
        </span>
        <span
          className={`font-bold tabular-nums tracking-tight text-foreground ${
            isLarge ? "text-6xl sm:text-7xl lg:text-8xl" : "text-4xl sm:text-5xl"
          }`}
        >
          {ticket.tillNumber}
        </span>
      </div>
      <p
        className={`mt-3 max-w-full truncate text-foreground/70 ${
          isLarge ? "text-lg sm:text-xl" : "text-base sm:text-lg"
        }`}
      >
        {ticket.queueLabel}
      </p>
    </div>
  );
}

function WaitingCard({ ticket }: { ticket: WaitingTicket }) {
  return (
    <div className="glass-panel flex items-center gap-4 rounded-xl px-5 py-4">
      <span className="text-4xl font-bold tabular-nums tracking-tight text-foreground sm:text-5xl">
        {ticket.ticketNumber}
      </span>
      <p className="min-w-0 flex-1 truncate text-base text-foreground/70 sm:text-lg">
        {ticket.queueLabel}
      </p>
    </div>
  );
}

export default function DisplayPage() {
  const router = useRouter();
  const [data, setData] = useState<DisplayData>({
    serving: [],
    held: [],
    waiting: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const announcedRef = useRef<Set<string>>(new Set());
  const lastCallCountRef = useRef<Map<string, number>>(new Map());
  const announcementQueueRef = useRef<Promise<void>>(Promise.resolve());
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const keepAliveRef = useRef<KeepAliveHandle | null>(null);
  const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const fetchDisplayRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const audioUnlockedRef = useRef(false);
  const pendingAnnounceRef = useRef<Set<string>>(new Set());

  const resetAudio = useCallback(() => {
    stopAudioKeepAlive(keepAliveRef.current);
    keepAliveRef.current = null;
    masterGainRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    bufferCacheRef.current.clear();
    audioUnlockedRef.current = false;
    setAudioUnlocked(false);
  }, []);

  const unlockAudio = useCallback(async () => {
    try {
      setError(null);
      const AudioCtx = getAudioContextClass();
      if (!AudioCtx) {
        setError("This browser does not support audio playback.");
        return;
      }

      stopAudioKeepAlive(keepAliveRef.current);
      keepAliveRef.current = null;
      if (audioContextRef.current?.state !== "closed") {
        void audioContextRef.current?.close();
      }

      const ctx = new AudioCtx();
      const masterGain = ctx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(ctx.destination);
      audioContextRef.current = ctx;
      masterGainRef.current = masterGain;

      if (!(await ensureAudioRunning(ctx))) {
        resetAudio();
        setError("Could not enable sound. Check browser permissions and try again.");
        return;
      }

      keepAliveRef.current = startAudioKeepAlive(ctx, masterGain);

      await Promise.all(
        PRELOAD_FILES.map((file) =>
          loadAudioBuffer(ctx, bufferCacheRef.current, audioUrl(file))
        )
      );
      const testBuffer = bufferCacheRef.current.get(audioUrl("ticketnumber.mp3"));
      if (testBuffer) {
        await playAudioBuffer(ctx, testBuffer, masterGain);
      }

      audioUnlockedRef.current = true;
      setAudioUnlocked(true);
      announcedRef.current.clear();
      lastCallCountRef.current.clear();
      pendingAnnounceRef.current.clear();
      void fetchDisplayRef.current();
    } catch {
      resetAudio();
      setError("Could not enable sound. Check browser permissions and try again.");
    }
  }, [resetAudio]);

  useEffect(() => {
    return () => {
      stopAudioKeepAlive(keepAliveRef.current);
      keepAliveRef.current = null;
      void audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, []);

  useEffect(() => {
    fetch("/api/auth/branch/me")
      .then((res) => {
        if (!res.ok) {
          router.replace("/display/login");
          return null;
        }
        return res.json();
      })
      .then((session) => {
        if (session?.name) setBranchName(session.name);
      })
      .catch(() => router.replace("/display/login"))
      .finally(() => setAuthChecked(true));
  }, [router]);

  const fetchDisplay = useCallback(async () => {
    if (!authChecked) return;
    try {
      const res = await fetch("/api/display");
      if (res.status === 401) {
        router.replace("/display/login");
        return;
      }
      if (!res.ok) {
        setError("Failed to load display");
        return;
      }
      const json = (await res.json()) as DisplayData;
      setData({
        serving: json.serving ?? [],
        held: json.held ?? [],
        waiting: json.waiting ?? [],
      });
      setError(null);

      const announced = announcedRef.current;
      const lastCallCount = lastCallCountRef.current;
      const bufferCache = bufferCacheRef.current;
      const toAnnounce: ServingTicket[] = [];

      for (const t of json.serving ?? []) {
        const key = `${t.ticketNumber}|${t.tillNumber}`;
        const callCount = t.callCount ?? 0;
        const prevCallCount = lastCallCount.get(key) ?? 0;
        if (pendingAnnounceRef.current.has(key)) continue;
        if (!announced.has(key)) {
          toAnnounce.push(t);
        } else if (callCount > prevCallCount) {
          toAnnounce.push(t);
        }
      }

      if (toAnnounce.length > 0 && audioUnlockedRef.current) {
        const batch = [...toAnnounce];
        const ctx = audioContextRef.current;
        const destination = masterGainRef.current;
        for (const t of batch) {
          pendingAnnounceRef.current.add(`${t.ticketNumber}|${t.tillNumber}`);
        }
        announcementQueueRef.current = announcementQueueRef.current
          .then(async () => {
            if (!ctx || !destination || ctx.state === "closed") {
              for (const t of batch) {
                pendingAnnounceRef.current.delete(`${t.ticketNumber}|${t.tillNumber}`);
              }
              return;
            }
            if (!(await ensureAudioRunning(ctx))) {
              for (const t of batch) {
                pendingAnnounceRef.current.delete(`${t.ticketNumber}|${t.tillNumber}`);
              }
              resetAudio();
              setError("Sound was paused by the browser. Tap Enable sound again.");
              return;
            }
            for (const t of batch) {
              const key = `${t.ticketNumber}|${t.tillNumber}`;
              try {
                const urls = getAnnouncementUrls(t.ticketNumber, t.tillNumber);
                for (let r = 0; r < ANNOUNCE_REPEAT_COUNT; r++) {
                  await playSequence(ctx, bufferCache, destination, urls);
                }
                announced.add(key);
                lastCallCount.set(key, t.callCount ?? 0);
              } finally {
                pendingAnnounceRef.current.delete(key);
              }
            }
          })
          .catch(() => {
            for (const t of batch) {
              pendingAnnounceRef.current.delete(`${t.ticketNumber}|${t.tillNumber}`);
            }
          });
      }
    } catch {
      setError("Failed to load display");
    } finally {
      setLoading(false);
    }
  }, [authChecked, router, audioUnlocked, resetAudio]);

  fetchDisplayRef.current = fetchDisplay;

  useEffect(() => {
    if (!authChecked) return;
    fetchDisplay();
    const id = setInterval(fetchDisplay, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchDisplay, authChecked]);

  async function handleLogout() {
    await fetch("/api/auth/branch/logout", { method: "POST" });
    router.replace("/display/login");
  }

  if (!authChecked || (loading && data.serving.length === 0 && data.held.length === 0 && data.waiting.length === 0)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="glass-panel-strong rounded-2xl px-12 py-10">
          <p className="text-xl text-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-gradient-to-br from-background via-card/30 to-background text-foreground">
      {!audioUnlocked && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
          <div className="glass-panel-strong max-w-md rounded-2xl p-8 text-center shadow-2xl">
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              Enable announcements
            </h2>
            <p className="mt-2 text-sm text-foreground/70 sm:text-base">
              Tap once to unlock sound. You should hear a short test clip immediately.
            </p>
            <Button
              type="button"
              className="mt-6 h-12 w-full text-base sm:text-lg"
              onClick={() => void unlockAudio()}
            >
              Enable sound
            </Button>
          </div>
        </div>
      )}
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
              onError={() => setLogoError(true)}
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
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <section
          className="glass-panel flex min-h-0 flex-[1.2] flex-col gap-4 rounded-2xl p-4 sm:p-5"
          aria-live="polite"
          aria-atomic="true"
        >
          <SectionHeader title="Now serving" count={data.serving.length} />
          {data.serving.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-lg text-foreground/55">No customers being served</p>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 auto-rows-fr gap-4 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {data.serving.map((t) => (
                <ServingCard
                  key={`${t.ticketNumber}-${t.tillNumber}`}
                  ticket={t}
                  size="large"
                />
              ))}
            </div>
          )}
        </section>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="glass-panel flex min-h-0 flex-col gap-4 rounded-2xl p-4 sm:p-5">
            <SectionHeader title="On hold" count={data.held.length} />
            {data.held.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-foreground/55">No tickets on hold</p>
              </div>
            ) : (
              <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto sm:grid-cols-2">
                {data.held.map((t) => (
                  <ServingCard
                    key={`held-${t.ticketNumber}-${t.tillNumber}`}
                    ticket={t}
                    size="medium"
                  />
                ))}
              </div>
            )}
          </section>

          <section className="glass-panel flex min-h-0 flex-col gap-4 rounded-2xl p-4 sm:p-5">
            <SectionHeader title="Waiting" count={data.waiting.length} />
            {data.waiting.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-foreground/55">Queue is empty</p>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                {data.waiting.map((t) => (
                  <WaitingCard key={`wait-${t.ticketNumber}`} ticket={t} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
