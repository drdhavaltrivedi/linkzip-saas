# LinkZip Pro

**Universal Bulk Downloader & ZIP Bundler**

> Paste a list of URLs — YouTube videos, PDFs, images, documents — and download everything as a single high-speed ZIP archive. No account required. Runs entirely in the browser.

🔗 **Live:** [linkzip-saas.vercel.app](https://linkzip-saas.vercel.app)  
🐙 **GitHub:** [github.com/drdhavaltrivedi/linkzip-saas](https://github.com/drdhavaltrivedi/linkzip-saas)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Batch ZIP** | Paste up to 100 links, get one ZIP file |
| **Single Download** | Download any direct file or YouTube video instantly |
| **YouTube Mode** | Dedicated tab with video preview, quality selector, and progress bar |
| **Format Selection** | Choose 360p / 720p / 1080p before downloading |
| **CORS Bypass** | Server-side proxy for cross-origin restricted files |
| **Parallel Downloads** | All files downloaded simultaneously, not sequentially |
| **Error Recovery** | Failed files shown clearly; ZIP still generated for successful ones |
| **PWA Ready** | Installable as a desktop/mobile app |

---

## 🧭 User Flow

```mermaid
flowchart TD
    A([User opens LinkZip]) --> B{Choose Mode}

    B --> C[Batch ZIP]
    B --> D[Single Download]
    B --> E[YouTube Mode]

    C --> C1[Paste multiple URLs\none per line]
    C1 --> C2[Click 'Download All in One ZIP']
    C2 --> C3[API fetches metadata\nfor all URLs]
    C3 --> C4[Files downloaded in parallel]
    C4 --> C5{All files done?}
    C5 -->|Yes| C6[JSZip bundles all files]
    C5 -->|Partial| C6
    C6 --> C7[Browser downloads\nLinkZip_Bundle.zip]

    D --> D1[Paste a single URL]
    D1 --> D2[Click 'Download Now']
    D2 --> D3[Direct file fetch\nor CORS proxy fallback]
    D3 --> D4[Browser triggers\ndirect file download]

    E --> E1[Paste YouTube URL]
    E1 --> E2[Auto-fetches video info\nafter 600ms debounce]
    E2 --> E3[Shows thumbnail,\ntitle, duration, views]
    E3 --> E4[User selects quality\n360p / 720p / 1080p]
    E4 --> E5[Click 'Download MP4']
    E5 --> E6[Server extracts direct\ngoolevideo.com URL via yt-dlp]
    E6 --> E7[Streams video with\nprogress bar]
    E7 --> E8[Browser saves .mp4 file]
```

---

## 🗄️ Entity Relationship Diagram

```mermaid
erDiagram
    SESSION {
        string id PK
        string mode "batch | single | youtube"
        timestamp createdAt
    }

    DOWNLOAD_ITEM {
        string id PK
        string sessionId FK
        string url
        string filename
        string type "pdf | video | audio | image | file"
        string status "idle | downloading | completed | error"
        int progress
        int sizeBytes
        string errorMessage
        string thumbnail
    }

    ZIP_BUNDLE {
        string id PK
        string sessionId FK
        string filename "LinkZip_Bundle.zip"
        int totalFiles
        int totalSizeBytes
        timestamp generatedAt
    }

    YOUTUBE_META {
        string id PK
        string url
        string title
        string thumbnail
        int durationSeconds
        string uploader
        int viewCount
        timestamp fetchedAt
    }

    YT_FORMAT {
        string id PK
        string metaId FK
        string formatId
        string label "360p MP4 | 720p MP4 | 1080p MP4"
        int height
        string ext
        int filesizeBytes
    }

    SESSION ||--o{ DOWNLOAD_ITEM : "contains"
    SESSION ||--o| ZIP_BUNDLE : "generates"
    YOUTUBE_META ||--o{ YT_FORMAT : "has"
    DOWNLOAD_ITEM }o--o| YOUTUBE_META : "may reference"
```

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph Browser["🌐 Browser (Client)"]
        UI[React UI / Next.js]
        JSZ[JSZip bundler]
        UI --> JSZ
    end

    subgraph Vercel["▲ Vercel Edge / Serverless"]
        META["/api/meta\nURL metadata detection"]
        PROXY["/api/proxy\nCORS bypass proxy"]
        YT["/api/download/youtube\nyt-dlp stream proxy"]
        YTINFO["/api/download/youtube/info\nVideo metadata & formats"]
    end

    subgraph External["🌍 External Sources"]
        PDF[Academic / CDN\nFile Servers]
        YTube[YouTube\n googlevideo.com CDN]
    end

    UI -->|POST urls| META
    META -->|HEAD requests| PDF
    META -->|yt-dlp metadata| YTube

    UI -->|GET file| PROXY
    PROXY -->|redirect follow + fetch| PDF

    UI -->|GET ?url=| YT
    YT -->|yt-dlp extract| YTube
    YT -->|stream body| UI

    UI -->|GET ?url=| YTINFO
    YTINFO -->|yt-dlp metadata| YTube
    YTINFO -->|JSON formats| UI

    JSZ -->|bundle| ZIP[(ZIP File\nDownloaded to disk)]
```

---

## 📁 Project Structure

```
linkzip-web/
├── src/
│   └── app/
│       ├── page.tsx                        # Main UI (Batch, Single, YouTube modes)
│       ├── layout.tsx                      # SEO metadata, JSON-LD, fonts
│       ├── globals.css                     # Dark-mode design system
│       ├── sitemap.ts                      # Auto-generated sitemap
│       ├── robots.ts                       # AI + search bot rules
│       └── api/
│           ├── meta/route.ts               # URL metadata detection
│           ├── proxy/route.ts              # CORS bypass proxy
│           └── download/
│               └── youtube/
│                   ├── route.ts            # yt-dlp stream (with format param)
│                   └── info/route.ts       # Video info + quality formats
├── public/
│   ├── logo.png                            # Brand logo / favicon
│   ├── icon.png                            # App icon
│   ├── manifest.json                       # PWA manifest
│   └── llms.txt                            # AI discovery file
├── package.json
└── README.md
```

---

## 🔌 API Reference

### `POST /api/meta`
Fetches metadata (filename, type, thumbnail) for an array of URLs.

**Request**
```json
{ "urls": ["https://example.com/paper.pdf", "https://youtube.com/watch?v=..."] }
```

**Response**
```json
{
  "results": [
    { "url": "...", "filename": "paper.pdf", "success": true, "type": "pdf" },
    { "url": "...", "filename": "My Video.mp4", "success": true, "type": "video", "thumbnail": "..." }
  ]
}
```

---

### `GET /api/proxy?url=<encoded>`
Server-side proxy that fetches external files and returns their binary content, bypassing browser CORS restrictions.

---

### `GET /api/download/youtube?url=<encoded>&format=<formatId>`
Extracts the direct stream URL via `yt-dlp` and proxies the video bytes. Returns `video/mp4` with `Content-Disposition`.

| Param | Required | Description |
|-------|----------|-------------|
| `url` | ✅ | Full YouTube URL |
| `format` | ❌ | Format ID from `/info` endpoint (e.g. `137`) |

---

### `GET /api/download/youtube/info?url=<encoded>`
Returns video metadata and available download quality formats.

**Response**
```json
{
  "title": "My Video",
  "thumbnail": "https://...",
  "duration": 312,
  "uploader": "Channel Name",
  "viewCount": 1200000,
  "formats": [
    { "formatId": "137", "label": "1080p MP4", "height": 1080, "ext": "mp4", "filesize": 52428800 },
    { "formatId": "22",  "label": "720p MP4",  "height": 720,  "ext": "mp4", "filesize": null }
  ]
}
```

---

## 🚀 Local Development

```bash
git clone https://github.com/drdhavaltrivedi/linkzip-saas.git
cd linkzip-saas/linkzip-web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Styling | Vanilla CSS + Glassmorphism |
| Animations | Framer Motion |
| Icons | Lucide React |
| ZIP Bundling | JSZip (client-side) |
| Video Extraction | youtube-dl-exec (yt-dlp) |
| Deployment | Vercel |

---

## 📜 License

MIT © 2026 LinkZip SaaS
