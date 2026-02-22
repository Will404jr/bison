# How to display video ads

This guide explains how to fetch and display video ads using the content API and the per-ad display URL.

**Implementation:** The display URL always returns an **HTML page**. For YouTube ads that page embeds the YouTube player; for uploaded videos or images it embeds a `<video>` or `<img>` whose `src` points to an authenticated media endpoint (`/api/content/ads/{id}/media`). The media endpoint streams the file and supports Range requests for video seeking. No redirects—one URL, one HTML response, reliable playback in iframes and new tabs.

## 1. Getting ads

Call one of these endpoints with your **branch API key**:

- **`GET /api/content`** – returns all content (forex, ads, announcements, socials, queues, logo). Use the `ads` array.
- **`GET /api/content/ads`** – returns only ads.

Send the key in a header:

- `Authorization: Bearer YOUR_BRANCH_API_KEY`
- or `X-API-Key: YOUR_BRANCH_API_KEY`

Each ad in the response includes a **`displayUrl`**, for example: `/api/content/ads/{id}/display`. Use this URL to show the ad (video or image) in your app.

## 2. Display URL authentication

The display URL requires the same branch API key. You can pass it in three ways:

- **Header:** `Authorization: Bearer YOUR_BRANCH_API_KEY` or `X-API-Key: YOUR_BRANCH_API_KEY`
- **Query (for iframes):** append `?key=YOUR_BRANCH_API_KEY` so the URL works as an iframe `src` or when opened in a new tab.

## 3. How to show a video ad

The display URL returns a full HTML page (see section 4). Build the full URL and use it in an iframe or open it in a new tab:

**Full URL format:**

```
{CMS_BASE_URL}{displayUrl}?key={BRANCH_API_KEY}
```

**Example – iframe:**

```html
<iframe
  src="https://cms.example.com/api/content/ads/abc123/display?key=your_branch_key"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen
></iframe>
```

**Example – open in new tab (e.g. from JavaScript):**

```js
const url = `https://cms.example.com${ad.displayUrl}?key=${branchApiKey}`;
window.open(url, "_blank");
```

Replace `https://cms.example.com` with your CMS base URL, `abc123` with the ad `id`, and `your_branch_key` with your branch API key.

## 4. Ad types (display URL always returns HTML)

The display URL **always returns HTML** so playback works reliably in iframes and new tabs:

- **YouTube ads** – The display URL returns an HTML page with an embedded YouTube iframe. The video plays inside that page (with autoplay for non-live; live streams use the YouTube embed).
- **Uploaded video ads** (e.g. `.mp4`, `.webm`, `.mov`) – The display URL returns an HTML page with a `<video>` element that loads the file from an authenticated **media URL** (`/api/content/ads/{id}/media?key=...`). The same `?key=` is passed through so playback works in iframes and new tabs. The media endpoint supports Range requests for seeking.
- **Uploaded image ads** (e.g. `.jpg`, `.png`) – The display URL returns an HTML page with an `<img>` that loads from the same media URL with auth.

Both types work when you use the same `displayUrl` in an iframe or new tab with the `?key=` parameter.

## 5. Using the media URL directly

The display page uses the **media URL** internally for uploaded files. You can also call it directly to get the raw file (e.g. for your own `<video>` or `<img>` in your app):

- **URL:** `GET /api/content/ads/{id}/media`
- **Auth:** Same as display (header or `?key=...`). Only works for uploaded files; YouTube ads have no media URL.
- **Response:** The file bytes (video or image) with correct `Content-Type`, `Content-Length`, and `Accept-Ranges: bytes`. Range requests are supported (206 Partial Content) for video seeking.
