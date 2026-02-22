import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Proxy external content API using AppSettings api_url and api_key. */
export async function GET() {
  try {
    const settings = await prisma.appSettings.findFirst();
    const row = settings as { apiUrl?: string | null; apiKey?: string | null } | null;
    const apiUrl = row?.apiUrl?.trim();
    const apiKey = row?.apiKey?.trim();
    if (!apiUrl || !apiKey) {
      return NextResponse.json(
        { error: "External content not configured. Set API URL and API key in Settings." },
        { status: 503 }
      );
    }
    const baseUrl = apiUrl.replace(/\/$/, "");
    const url = `${baseUrl}/api/content`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("External content fetch failed:", res.status, text);
      return NextResponse.json(
        { error: "Failed to fetch external content" },
        { status: 502 }
      );
    }
    const data = (await res.json()) as {
      logo?: { url?: string };
      queues?: unknown[];
      forex?: unknown[];
      ads?: unknown[];
      announcements?: unknown[];
      socials?: unknown[];
    };
    const out: Record<string, unknown> = { ...data };
    out.apiUrl = baseUrl;
    if (data.logo?.url) {
      const logoPath = data.logo.url.startsWith("/") ? data.logo.url : `/${data.logo.url}`;
      out.logo = { url: `${baseUrl}${logoPath}` };
    }
    if (Array.isArray(data.ads)) {
      out.ads = data.ads.map((ad: unknown) => {
        const item =
          typeof ad === "object" && ad !== null ? { ...(ad as Record<string, unknown>) } : {};
        if (typeof item.displayUrl === "string") {
          const path = item.displayUrl.startsWith("/") ? item.displayUrl : `/${item.displayUrl}`;
          item.displayUrl = `${baseUrl}${path}`;
        }
        if (typeof item.ad === "string") {
          const path = item.ad.startsWith("/") ? item.ad : `/${item.ad}`;
          item.adUrl = `${baseUrl}${path}`;
        }
        return item;
      });
    }
    return NextResponse.json(out);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch external content" },
      { status: 500 }
    );
  }
}
