import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Fetch the CMS display HTML for an ad, rewrite it so videos autoplay muted, then serve it.
 * This avoids relying on the CMS to honor query params; we inject autoplay/muted and a play() script.
 * See updated-display-video-ads.md.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !id.trim()) {
    return NextResponse.json({ error: "Missing ad id" }, { status: 400 });
  }
  try {
    const settings = await prisma.appSettings.findFirst();
    const row = settings as { apiUrl?: string | null; apiKey?: string | null } | null;
    const apiUrl = row?.apiUrl?.trim();
    const apiKey = row?.apiKey?.trim();
    if (!apiUrl || !apiKey) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }
    const base = apiUrl.replace(/\/$/, "");
    const displayPath = `/api/content/ads/${encodeURIComponent(id.trim())}/display`;
    const params = new URLSearchParams({ key: apiKey });
    const url = `${base}${displayPath}?${params.toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, "X-API-Key": apiKey },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }
    const contentType = res.headers.get("content-type") ?? "text/html";
    if (!contentType.includes("text/html")) {
      return new NextResponse(await res.arrayBuffer(), {
        status: 200,
        headers: { "Content-Type": contentType },
      });
    }
    let html = await res.text();
    const keyParam = `key=${encodeURIComponent(apiKey)}`;

    if (!/<video[\s>]/i.test(html)) {
      return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    html = html.replace(/<video(\s)/gi, "<video autoplay muted playsinline$1");
    html = html.replace(/\sautoplay\s*=\s*["']?["']?\s*muted/gi, " autoplay muted");
    html = html.replace(/\splaysinline/gi, " playsinline");

    const relativeSrc = /(src|href)=["'](\/(?!\/))([^"']*)["']/g;
    html = html.replace(relativeSrc, (_, attr, _slash, path) => {
      const full = `${base}/${path}`;
      const sep = full.includes("?") ? "&" : "?";
      const withKey = full.includes("key=") ? full : `${full}${sep}${keyParam}`;
      return `${attr}="${withKey}"`;
    });

    const playScript =
      "<script>(function(){ var v=document.querySelectorAll('video'); v.forEach(function(el){ el.muted=true; el.play().catch(function(){}); }); })();</script>";
    const muteListenerScript =
      "<script>window.addEventListener('message',function(e){ if(e.data&&e.data.type==='setMuted'){ document.querySelectorAll('video').forEach(function(v){ v.muted=e.data.muted; if(!e.data.muted) v.play().catch(function(){}); }); }});</script>";
    const scripts = playScript + muteListenerScript;
    if (html.includes("</body>")) {
      html = html.replace("</body>", scripts + "</body>");
    } else {
      html += scripts;
    }

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load ad display" }, { status: 502 });
  }
}
