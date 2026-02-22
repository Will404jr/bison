"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { VolumeX, Volume2 } from "lucide-react";

const POLL_INTERVAL_MS = 4000;
const DISPLAY_CONTENT_POLL_MS = 5 * 60 * 1000; // 5 minutes
const AD_ROTATION_MS = 15000; // show one ad then shuffle to next
const AUDIO_BASE = "/audio";
const ANNOUNCE_REPEAT_COUNT = 2;

type DisplayTicket = {
  ticketNumber: string;
  tillNumber: number;
  serviceName: string;
  status: string;
  callCount?: number;
};

type ExternalAnnouncement = {
  content?: string;
  announcementType?: { name?: string; bgColor?: string; textColor?: string };
};
type ExternalAd =
  | { id?: string; displayUrl?: string; ad?: string; adUrl?: string; name?: string; type?: string; mediaType?: string }
  | string;
type ForexRow = {
  countryCode?: string;
  moneyCode?: string;
  buyingPrice?: string | number;
  sellingPrice?: string | number;
};

type ExternalContent = {
  apiUrl?: string;
  announcements?: ExternalAnnouncement[];
  ads?: ExternalAd[];
  forex?: ForexRow[];
};

/** All audio filenames we preload. */
const PRELOAD_FILES = [
  "ticketnumber.mp3",
  "tocounter.mp3",
  ...["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => `${d}.mp3`),
  ...["A", "B", "C", "D", "E", "F"].map((l) => `${l}.mp3`),
];

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

function playOneUrl(url: string, preloadedMap: Map<string, HTMLAudioElement>): Promise<void> {
  return new Promise((resolve) => {
    let audio = preloadedMap.get(url);
    if (!audio) audio = new Audio(url);
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

function playSequence(urls: string[], preloadedMap: Map<string, HTMLAudioElement>): Promise<void> {
  return urls.reduce((p, url) => p.then(() => playOneUrl(url, preloadedMap)), Promise.resolve());
}

// ——— Flip clock: time with card-style digits ———
function useTime() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function formatTime(d: Date): { h: string; m: string; s: string } {
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  return {
    h: String(h).padStart(2, "0"),
    m: String(m).padStart(2, "0"),
    s: String(s).padStart(2, "0"),
  };
}

function FlipDigit({ value }: { value: string }) {
  return (
    <div
      className="flex h-12 w-11 items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 shadow-inner sm:h-14 sm:w-12"
      aria-hidden
    >
      <span className="text-2xl font-bold tabular-nums text-white sm:text-3xl">{value}</span>
    </div>
  );
}

function FlipClock() {
  const t = useTime();
  const { h, m, s } = formatTime(t);
  return (
    <div className="flex items-center gap-1 sm:gap-2" role="timer" aria-label={`Time: ${h}:${m}:${s}`}>
      <FlipDigit value={h} />
      <span className="text-xl text-zinc-500">:</span>
      <FlipDigit value={m} />
      <span className="text-xl text-zinc-500">:</span>
      <FlipDigit value={s} />
    </div>
  );
}

// ——— Marquee: single line, flows right to left (enters from right, exits left) ———
function AnnouncementMarquee({ text }: { text: string }) {
  const displayText = text.trim() || "No announcement";
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute top-1/2 w-max -translate-y-1/2 whitespace-nowrap pr-8 text-xl font-medium will-change-[right] sm:text-2xl animate-display-marquee-right-to-left"
        style={{ right: 0 }}
      >
        {displayText}
      </div>
    </div>
  );
}

// ——— Display page ———
export default function DisplayPage() {
  const [tickets, setTickets] = useState<DisplayTicket[]>([]);
  const [external, setExternal] = useState<ExternalContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const announcedRef = useRef<Set<string>>(new Set());
  const lastCallCountRef = useRef<Map<string, number>>(new Map());
  const announcementQueueRef = useRef<Promise<void>>(Promise.resolve());
  const preloadedAudioRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const map = preloadedAudioRef.current;
    let loaded = 0;
    const total = PRELOAD_FILES.length;
    const checkReady = () => {
      loaded++;
      if (loaded >= total) map.set("ready", null!);
    };
    PRELOAD_FILES.forEach((file) => {
      const url = `${AUDIO_BASE}/${file}`;
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
      setTickets(data.tickets ?? []);
      setError(null);

      const announced = announcedRef.current;
      const lastCallCount = lastCallCountRef.current;
      const preloadedMap = preloadedAudioRef.current;
      const toAnnounce: DisplayTicket[] = [];

      for (const t of data.tickets ?? []) {
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
        announcementQueueRef.current = announcementQueueRef.current.then(async () => {
          for (const t of toAnnounce) {
            const urls = getAnnouncementUrls(t.ticketNumber, t.tillNumber);
            for (let r = 0; r < ANNOUNCE_REPEAT_COUNT; r++) {
              await playSequence(urls, preloadedMap);
            }
          }
        });
      }
    } catch {
      setError("Failed to load display");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExternal = useCallback(async () => {
    try {
      const res = await fetch("/api/external/content");
      if (res.ok) {
        const data = (await res.json()) as ExternalContent;
        setExternal({
          apiUrl: typeof data.apiUrl === "string" ? data.apiUrl : undefined,
          announcements: Array.isArray(data.announcements) ? data.announcements : [],
          ads: Array.isArray(data.ads) ? data.ads : [],
          forex: Array.isArray(data.forex) ? data.forex : [],
        });
      }
    } catch {
      setExternal(null);
    }
  }, []);

  useEffect(() => {
    fetchDisplay();
    const id = setInterval(fetchDisplay, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchDisplay]);

  useEffect(() => {
    fetchExternal();
    const id = setInterval(fetchExternal, DISPLAY_CONTENT_POLL_MS);
    return () => clearInterval(id);
  }, [fetchExternal]);

  const announcements = external?.announcements ?? [];
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  useEffect(() => {
    if (announcements.length <= 1) return;
    const id = setInterval(
      () => setAnnouncementIndex((i) => (i + 1) % announcements.length),
      20000
    );
    return () => clearInterval(id);
  }, [announcements.length]);
  const currentAnnouncement =
    announcements[announcements.length > 0 ? announcementIndex % announcements.length : 0];
  const announcementTypeName = currentAnnouncement?.announcementType?.name ?? "Now Serving";
  const announcementTypeStyle = currentAnnouncement?.announcementType
    ? {
        backgroundColor: currentAnnouncement.announcementType.bgColor ?? undefined,
        color: currentAnnouncement.announcementType.textColor ?? undefined,
      }
    : undefined;
  const announcementText =
    currentAnnouncement?.content ??
    (tickets.length > 0
      ? `Ticket ${tickets.map((t) => `${t.ticketNumber} → Till ${t.tillNumber}`).join("  •  ")}`
      : "Welcome. Please wait for your number to be called.");

  const apiUrl = external?.apiUrl ?? "";
  const ads = external?.ads ?? [];
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const adIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setCurrentAdIndex(0);
  }, [ads.length]);
  useEffect(() => {
    setIsMuted(true);
  }, [currentAdIndex]);

  useEffect(() => {
    if (ads.length <= 1) return;
    const id = setInterval(
      () => setCurrentAdIndex((i) => (i + 1) % ads.length),
      AD_ROTATION_MS
    );
    return () => clearInterval(id);
  }, [ads.length]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const origin = apiUrl ? new URL(apiUrl).origin : "";
      if (origin && e.origin !== origin) return;
      const data = e.data;
      if (data && typeof data === "object" && (data.type === "adEnded" || data.type === "videoEnded")) {
        setCurrentAdIndex((i) => (i + 1) % ads.length);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [apiUrl, ads.length]);

  const sendMuteToIframe = useCallback((muted: boolean) => {
    const iframe = adIframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      const targetOrigin =
        typeof window !== "undefined" ? window.location.origin : "*";
      iframe.contentWindow.postMessage({ type: "setMuted", muted }, targetOrigin);
    } catch {
      /* ignore */
    }
  }, []);

  /** Tell iframe to start muted so video can autoplay without sound. Retry so CMS video has time to mount. */
  const handleAdIframeLoad = useCallback(() => {
    sendMuteToIframe(true);
    setTimeout(() => sendMuteToIframe(true), 300);
    setTimeout(() => sendMuteToIframe(true), 800);
  }, [sendMuteToIframe]);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => {
      const next = !m;
      sendMuteToIframe(next);
      return next;
    });
  }, [sendMuteToIframe]);

  /** Display URL for an ad. Prefer redirect route by id (per updated-display-video-ads.md); fallback to proxy with displayUrl. */
  function getAdIframeSrc(item: ExternalAd): string | null {
    if (typeof item === "object" && item.id) {
      return `/api/external/ad-display?id=${encodeURIComponent(item.id)}`;
    }
    if (typeof item === "string") {
      const path = item.startsWith("/") ? item : `/${item}`;
      const full = apiUrl ? `${apiUrl.replace(/\/$/, "")}${path}` : item;
      return full.startsWith("http") ? `/api/external/ad-image?url=${encodeURIComponent(full)}` : full;
    }
    const raw = item.displayUrl ?? item.adUrl ?? item.ad ?? "";
    if (!raw) return null;
    const full =
      raw.startsWith("http://") || raw.startsWith("https://")
        ? raw
        : apiUrl
          ? `${apiUrl.replace(/\/$/, "")}${raw.startsWith("/") ? raw : `/${raw}`}`
          : raw;
    return full.startsWith("http") ? `/api/external/ad-image?url=${encodeURIComponent(full)}` : full;
  }

  const currentAd = ads.length > 0 ? ads[currentAdIndex % ads.length] : null;
  const forex = external?.forex ?? [];

  if (loading && tickets.length === 0 && !external) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-900 text-white">
        <p className="text-xl">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-900 text-white">
      {/* Top bar: announcement type (full height) | marquee | time */}
      <header className="flex shrink-0 items-stretch gap-0 border-b border-zinc-700 bg-zinc-800/80">
        <div
          className="flex w-36 shrink-0 items-center justify-center rounded-none px-4 sm:w-44"
          style={announcementTypeStyle}
        >
          <span className="text-center text-base font-bold uppercase tracking-wide sm:text-lg">
            {announcementTypeName}
          </span>
        </div>
        <div className="min-h-[3.5rem] min-w-0 flex-1 py-2">
          <AnnouncementMarquee text={announcementText} />
        </div>
        <div className="flex shrink-0 items-center p-3">
          <FlipClock />
        </div>
      </header>

      {/* Content: left = ads + tickets, right = forex full height to bottom of screen */}
      <div className="flex min-h-0 flex-1">
        {/* Left column: ads (fits in space) + tickets bar at bottom */}
        <div className="flex min-w-0 flex-1 flex-col min-h-0">
          {/* Ads - one at a time, rotate on end (postMessage adEnded/videoEnded) or timer. Mute control for iframe. */}
          <section className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden border-b border-zinc-700 bg-zinc-800/40 p-4">
            {currentAd ? (
              (() => {
                const item = typeof currentAd === "string" ? { displayUrl: currentAd } : currentAd;
                const src = getAdIframeSrc(item);
                if (!src) return null;
                const label = typeof item === "object" && item.name ? String(item.name) : "Ad";
                return (
                  <div
                    key={currentAdIndex}
                    className="relative flex h-full max-h-full w-full max-w-full items-center justify-center overflow-hidden rounded-xl bg-zinc-700 p-2"
                  >
                    <iframe
                      ref={adIframeRef}
                      key={
                        typeof item === "object" && item.id
                          ? `ad-${item.id}`
                          : `ad-${currentAdIndex}`
                      }
                      src={src}
                      title={label}
                      className="h-full w-full min-h-0 min-w-0 rounded-lg border-0 object-contain"
                      allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      onLoad={handleAdIframeLoad}
                    />
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/50"
                      aria-label={isMuted ? "Unmute ad" : "Mute ad"}
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? (
                        <VolumeX className="h-5 w-5" aria-hidden />
                      ) : (
                        <Volume2 className="h-5 w-5" aria-hidden />
                      )}
                    </button>
                  </div>
                );
              })()
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-500">
                <span className="text-sm">Ad space</span>
              </div>
            )}
          </section>

          {/* Tickets bar - fixed height at bottom of left column */}
          <footer
            className="flex min-h-[5.5rem] shrink-0 items-center gap-4 border-t border-zinc-700 bg-zinc-800/80 px-4 py-4"
            aria-live="polite"
            aria-atomic="true"
          >
            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            {tickets.length === 0 ? (
              <p className="text-zinc-500">No tickets currently being served</p>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-6">
                {tickets.map((t) => (
                  <div
                    key={`${t.ticketNumber}-${t.tillNumber}`}
                    className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800/80 px-6 py-3"
                  >
                    <span className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
                      {t.ticketNumber}
                    </span>
                    <span className="text-3xl text-zinc-400 sm:text-4xl">→</span>
                    <span className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
                      {t.tillNumber}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </footer>
        </div>

        {/* Forex - full height from below header to bottom of screen */}
        <aside className="flex h-full min-w-[26rem] shrink-0 flex-col border-l border-zinc-700 bg-zinc-800/60 sm:min-w-[30rem]">
          <div className="border-b border-zinc-600 px-4 py-3">
            <h2 className="text-base font-semibold uppercase tracking-wide text-amber-400 sm:text-lg">Forex</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {forex.length > 0 ? (
              <table className="w-full text-left text-xl sm:text-2xl">
                <thead className="sticky top-0 bg-zinc-800 text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium"></th>
                    <th className="px-4 py-3 font-medium"></th>
                    <th className="px-4 py-3 font-medium">Buy</th>
                    <th className="px-4 py-3 font-medium">Sell</th>
                  </tr>
                </thead>
                <tbody>
                  {forex.map((row, i) => (
                    <tr key={i} className="border-t border-zinc-700/80">
                      <td className="px-4 py-2.5 font-extrabold text-white">
                        {row.countryCode ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-300 font-extrabold">
                        {row.moneyCode ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-300 tabular-nums font-extrabold">
                        {row.buyingPrice != null ? String(row.buyingPrice) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-300 tabular-nums font-extrabold">
                        {row.sellingPrice != null ? String(row.sellingPrice) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center text-zinc-500 text-base">
                No forex data
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
