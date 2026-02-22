import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Proxy ad media (image or video) so the request is made with API key. Supports Range for video streaming. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  try {
    const settings = await prisma.appSettings.findFirst();
    const row = settings as { apiKey?: string | null } | null;
    const apiKey = row?.apiKey?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }
    const range = request.headers.get("range");
    const headers: HeadersInit = {
      Authorization: `Bearer ${apiKey}`,
      "X-API-Key": apiKey,
    };
    if (range) headers["Range"] = range;
    const urlWithKey = url + (url.includes("?") ? "&" : "?") + "key=" + encodeURIComponent(apiKey);
    const res = await fetch(urlWithKey, {
      headers,
      redirect: "follow",
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }
    const contentType = res.headers.get("content-type") ?? "image/*";
    const body = await res.arrayBuffer();
    const responseHeaders: HeadersInit = { "Content-Type": contentType };
    if (res.status === 206) {
      const contentRange = res.headers.get("content-range");
      if (contentRange) responseHeaders["Content-Range"] = contentRange;
      const acceptRanges = res.headers.get("accept-ranges");
      if (acceptRanges) responseHeaders["Accept-Ranges"] = acceptRanges;
    }
    if (contentType.startsWith("video/")) {
      if (!responseHeaders["Accept-Ranges"]) responseHeaders["Accept-Ranges"] = "bytes";
      const contentLength = res.headers.get("content-length");
      if (contentLength) responseHeaders["Content-Length"] = contentLength;
    }
    return new NextResponse(body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 502 });
  }
}
