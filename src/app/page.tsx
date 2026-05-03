"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  Globe,
  Video,
  Music,
  FileText,
  Image as ImageIcon,
  Layers,
  File as FileIcon,
  CirclePlay,
  Clock,
  Eye,
} from "lucide-react";
import JSZip from "jszip";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  status: "idle" | "fetching" | "downloading" | "completed" | "error";
  progress: number;
  type: string;
  error?: string;
  size?: number;
  thumbnail?: string;
}

interface YtFormat {
  formatId: string;
  label: string;
  height: number;
  ext: string;
  filesize: number | null;
}

interface YtVideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  viewCount: number;
  formats: YtFormat[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatViews(n: number) {
  if (!n) return "0";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  // Batch / Single mode
  const [input, setInput] = useState("");
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<"batch" | "single" | "youtube">("batch");
  const [isZipping, setIsZipping] = useState(false);

  // YouTube tab
  const [ytUrl, setYtUrl] = useState("");
  const [ytInfo, setYtInfo] = useState<YtVideoInfo | null>(null);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState("");
  const [ytFormat, setYtFormat] = useState("");
  const [ytDownloading, setYtDownloading] = useState(false);
  const [ytProgress, setYtProgress] = useState(0);
  const [ytDone, setYtDone] = useState(false);

  // Auto-fetch YouTube info whenever the URL input changes
  useEffect(() => {
    const trimmed = ytUrl.trim();
    if (!trimmed) {
      setYtInfo(null);
      setYtError("");
      return;
    }
    const isYT = trimmed.includes("youtube.com") || trimmed.includes("youtu.be");
    if (!isYT) {
      setYtError("Please paste a valid YouTube URL");
      setYtInfo(null);
      return;
    }
    setYtError("");

    const timer = setTimeout(async () => {
      setYtLoading(true);
      setYtInfo(null);
      setYtDone(false);
      try {
        const res = await fetch(
          `/api/download/youtube/info?url=${encodeURIComponent(trimmed)}`
        );
        if (!res.ok) throw new Error(await res.text());
        const data: YtVideoInfo = await res.json();
        setYtInfo(data);
        setYtFormat(data.formats[0]?.formatId || "");
      } catch (e: any) {
        setYtError(e.message || "Failed to load video info");
      } finally {
        setYtLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [ytUrl]);

  const downloadYtVideo = async () => {
    if (!ytInfo || ytDownloading) return;
    setYtDownloading(true);
    setYtProgress(0);
    setYtError("");
    try {
      const params = new URLSearchParams({ url: ytUrl.trim() });
      if (ytFormat) params.set("format", ytFormat);

      const res = await fetch(`/api/download/youtube?${params}`);
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const cl = +(res.headers.get("Content-Length") || 0);
      let received = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chunks: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (cl) setYtProgress(Math.min(99, Math.round((received / cl) * 100)));
      }

      const blob = new Blob(chunks, { type: "video/mp4" });
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `${(ytInfo.title || "video").replace(/[^a-zA-Z0-9 _-]/g, "").trim()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
      setYtProgress(100);
      setYtDone(true);
    } catch (e: any) {
      setYtError(e.message || "Download failed");
    } finally {
      setYtDownloading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "video": return <Video size={20} />;
      case "audio": return <Music size={20} />;
      case "pdf":   return <FileText size={20} />;
      case "image": return <ImageIcon size={20} />;
      default:      return <FileIcon size={20} />;
    }
  };

  const processLinks = async () => {
    const urls = input
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http"));
    if (urls.length === 0) return;

    setIsProcessing(true);
    setItems([]);

    try {
      const metaRes = await fetch("/api/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const { results } = await metaRes.json();

      const workingItems: DownloadItem[] = urls.map((url, i) => ({
        id: `item-${i}`,
        url,
        filename: results[i]?.filename || `file_${i + 1}`,
        status: (results[i]?.success ? "downloading" : "error") as DownloadItem["status"],
        type: results[i]?.type || "file",
        thumbnail: results[i]?.thumbnail,
        progress: 0,
        error: results[i]?.success ? undefined : results[i]?.error,
      }));

      setItems(workingItems);

      const zip = new JSZip();
      let zipFileCount = 0;

      await Promise.all(
        workingItems.map(async (item) => {
          if (item.status === "error") return;
          try {
            const isYT =
              item.url.includes("youtube.com") || item.url.includes("youtu.be");
            let finalFilename = item.filename;
            let res: Response;

            if (isYT) {
              setItems((prev) =>
                prev.map((p) => (p.id === item.id ? { ...p, progress: 5 } : p))
              );
              res = await fetch(
                `/api/download/youtube?url=${encodeURIComponent(item.url)}`
              );
              if (!res.ok)
                throw new Error((await res.text()) || `HTTP ${res.status}`);
              const cd = res.headers.get("Content-Disposition");
              const match = cd?.match(/filename="?([^"]+)"?/);
              if (match) finalFilename = match[1];
              setItems((prev) =>
                prev.map((p) =>
                  p.id === item.id ? { ...p, filename: finalFilename, progress: 10 } : p
                )
              );
            } else {
              try {
                res = await fetch(item.url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
              } catch {
                res = await fetch(
                  `/api/proxy?url=${encodeURIComponent(item.url)}`
                );
                if (!res.ok) throw new Error(`Proxy failed: HTTP ${res.status}`);
              }
            }

            const reader = res.body?.getReader();
            if (!reader) throw new Error("No response body");
            const contentLength = +(res.headers.get("Content-Length") || 0);
            let receivedLength = 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const chunks: any[] = [];

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
              receivedLength += value.length;
              const progress = contentLength
                ? Math.min(99, Math.round((receivedLength / contentLength) * 100))
                : Math.min(90, receivedLength / 1024 / 100);
              setItems((prev) =>
                prev.map((p) =>
                  p.id === item.id
                    ? { ...p, progress: isYT ? 10 + progress * 0.9 : progress }
                    : p
                )
              );
            }

            const blob = new Blob(chunks);

            if (mode === "batch") {
              zip.file(finalFilename, blob);
              zipFileCount++;
            } else {
              const objUrl = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = objUrl;
              a.download = finalFilename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(objUrl);
            }

            setItems((prev) =>
              prev.map((p) =>
                p.id === item.id
                  ? { ...p, status: "completed", progress: 100, size: receivedLength }
                  : p
              )
            );
          } catch (err: any) {
            console.error(`Failed ${item.url}:`, err);
            setItems((prev) =>
              prev.map((p) =>
                p.id === item.id
                  ? { ...p, status: "error", progress: 0, error: err.message || "Download failed" }
                  : p
              )
            );
          }
        })
      );

      if (mode === "batch" && zipFileCount > 0) {
        setIsZipping(true);
        const content = await zip.generateAsync({ type: "blob" });
        const zipUrl = window.URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = zipUrl;
        a.download = "LinkZip_Bundle.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(zipUrl);
        setIsZipping(false);
      }
    } catch (error) {
      console.error("Process error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen relative p-6 md:p-12 lg:p-24 overflow-hidden">
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full blur-[128px] -z-10 animate-pulse" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] -z-10 animate-pulse" />

      <div className="max-w-5xl mx-auto space-y-12">

        {/* ── Header ────────────────────────────────── */}
        <header className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-sm font-medium mb-4"
          >
            <img src="/logo.png" className="w-5 h-5 object-contain" alt="LinkZip Logo" />
            <span>LinkZip Pro v2.1</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-5xl md:text-7xl font-bold tracking-tight"
          >
            Universal <span className="gradient-text">Downloader</span>
          </motion.h1>
          <p className="text-foreground/60 text-lg max-w-2xl mx-auto">
            YouTube videos, research papers, and media. One click to bundle them all.
          </p>
        </header>

        {/* ── Mode Toggle ───────────────────────────── */}
        <div className="flex justify-center">
          <div className="bg-white/5 p-1 rounded-2xl flex border border-white/10">
            <button
              onClick={() => setMode("batch")}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                mode === "batch"
                  ? "bg-primary text-white"
                  : "text-foreground/40 hover:text-foreground/60"
              )}
            >
              <Layers size={16} /> Batch ZIP
            </button>
            <button
              onClick={() => setMode("single")}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                mode === "single"
                  ? "bg-primary text-white"
                  : "text-foreground/40 hover:text-foreground/60"
              )}
            >
              <Download size={16} /> Single
            </button>
            <button
              onClick={() => setMode("youtube")}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                mode === "youtube"
                  ? "bg-red-600 text-white shadow-lg shadow-red-500/25"
                  : "text-foreground/40 hover:text-foreground/60"
              )}
            >
              <CirclePlay size={16} /> YouTube
            </button>
          </div>
        </div>

        {/* ── Batch / Single Tab ────────────────────── */}
        <AnimatePresence mode="wait">
          {mode !== "youtube" && (
            <motion.div
              key="batch-single"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass rounded-3xl p-8 space-y-6"
            >
              <textarea
                placeholder={
                  mode === "batch"
                    ? "Paste multiple links (one per line)…"
                    : "Paste a single link…"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full h-48 bg-white/5 rounded-2xl p-6 text-foreground placeholder:text-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-white/10 resize-none"
              />
              <button
                onClick={processLinks}
                disabled={isProcessing || !input.trim()}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-xl",
                  isProcessing
                    ? "bg-white/10 cursor-not-allowed"
                    : "gradient-bg text-white hover:scale-[1.01] active:scale-[0.99]"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {isZipping ? "Creating ZIP…" : "Processing…"}
                  </>
                ) : mode === "batch" ? (
                  <><FileArchive /> Download All in One ZIP</>
                ) : (
                  <><Download /> Download Now</>
                )}
              </button>
              {mode === "batch" && !isProcessing && (
                <p className="text-center text-xs text-foreground/30 flex items-center justify-center gap-1">
                  <CheckCircle2 size={12} /> All files will be bundled into a single ZIP archive.
                </p>
              )}
            </motion.div>
          )}

          {/* ── YouTube Tab ─────────────────────────── */}
          {mode === "youtube" && (
            <motion.div
              key="youtube"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* URL input */}
              <div className="glass rounded-3xl p-6 space-y-3">
                <label className="block text-sm font-semibold text-foreground/50">
                  YouTube URL
                </label>
                <input
                  type="url"
                  value={ytUrl}
                  onChange={(e) => {
                    setYtUrl(e.target.value);
                    setYtDone(false);
                  }}
                  placeholder="https://www.youtube.com/watch?v=… or /shorts/…"
                  className="w-full bg-white/5 rounded-2xl px-5 py-4 text-foreground placeholder:text-foreground/20 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all border border-white/10"
                />
                <AnimatePresence>
                  {ytLoading && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-foreground/40 text-sm"
                    >
                      <Loader2 size={14} className="animate-spin" />
                      Fetching video info…
                    </motion.p>
                  )}
                  {ytError && !ytLoading && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-red-400 text-sm"
                    >
                      <AlertCircle size={14} /> {ytError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Video preview card */}
              <AnimatePresence>
                {ytInfo && !ytLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="glass rounded-3xl overflow-hidden"
                  >
                    <div className="grid md:grid-cols-[3fr_2fr]">

                      {/* Thumbnail */}
                      <div className="relative bg-black">
                        <div className="aspect-video">
                          <img
                            src={ytInfo.thumbnail}
                            alt={ytInfo.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          {ytInfo.duration > 0 && (
                            <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/80 text-white text-xs font-mono px-2 py-0.5 rounded-md">
                              <Clock size={10} />
                              {formatDuration(ytInfo.duration)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Details + controls */}
                      <div className="p-6 flex flex-col gap-5">

                        {/* Title + meta */}
                        <div className="space-y-2">
                          <h3 className="font-bold text-base leading-snug line-clamp-3">
                            {ytInfo.title}
                          </h3>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/45">
                            {ytInfo.uploader && <span>{ytInfo.uploader}</span>}
                            {ytInfo.viewCount > 0 && (
                              <span className="flex items-center gap-1">
                                <Eye size={10} />
                                {formatViews(ytInfo.viewCount)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quality selector — only shown when multiple combined formats exist */}
                        {ytInfo.formats.length > 1 && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground/45">
                              Quality
                            </label>
                            <select
                              value={ytFormat}
                              onChange={(e) => setYtFormat(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40 cursor-pointer"
                            >
                              {ytInfo.formats.map((f) => (
                                <option
                                  key={f.formatId}
                                  value={f.formatId}
                                  className="bg-zinc-900"
                                >
                                  {f.label}
                                  {f.filesize
                                    ? ` · ${(f.filesize / 1024 / 1024).toFixed(1)} MB`
                                    : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Download button */}
                        <button
                          onClick={downloadYtVideo}
                          disabled={ytDownloading || ytDone}
                          className={cn(
                            "mt-auto py-3 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                            ytDone
                              ? "bg-green-600/15 text-green-400 border border-green-500/25 cursor-default"
                              : ytDownloading
                              ? "bg-white/5 cursor-not-allowed text-foreground/40"
                              : "bg-red-600 hover:bg-red-500 text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-500/20"
                          )}
                        >
                          {ytDone ? (
                            <><CheckCircle2 size={17} /> Downloaded</>
                          ) : ytDownloading ? (
                            <><Loader2 size={17} className="animate-spin" /> Downloading…</>
                          ) : (
                            <><Download size={17} /> Download MP4</>
                          )}
                        </button>

                        {/* Progress */}
                        <AnimatePresence>
                          {ytDownloading && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="space-y-1"
                            >
                              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-red-500 rounded-full"
                                  animate={{ width: `${ytProgress}%` }}
                                  transition={{ duration: 0.3 }}
                                />
                              </div>
                              <p className="text-xs text-foreground/35 text-right">
                                {ytProgress}%
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Download items grid (batch / single) ──── */}
        <AnimatePresence>
          {items.length > 0 && mode !== "youtube" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  className="glass glass-hover rounded-2xl p-4 flex items-center gap-4"
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden",
                      item.status === "completed"
                        ? "bg-green-500/10 text-green-500"
                        : item.status === "error"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : item.status === "error" ? (
                      <AlertCircle size={20} />
                    ) : (
                      getIcon(item.type)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-sm">{item.filename}</p>
                    {item.status === "error" ? (
                      <p className="text-red-400 text-xs mt-1 truncate">{item.error}</p>
                    ) : (
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                        <motion.div
                          className={cn(
                            "h-full",
                            item.status === "completed" ? "bg-green-500" : "bg-primary"
                          )}
                          animate={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {item.status === "completed" && (
                    <CheckCircle2 className="text-green-500 shrink-0" size={20} />
                  )}
                  {item.status === "error" && (
                    <AlertCircle className="text-red-500 shrink-0" size={20} />
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── SEO block ─────────────────────────────── */}
        <section className="mt-16 pt-12 border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-foreground/30 text-xs leading-relaxed">
            <div>
              <h2 className="text-foreground/50 font-semibold mb-2 text-sm">
                What is LinkZip Pro?
              </h2>
              <p>
                LinkZip is the fastest bulk URL downloader and ZIP bundler online. Paste any
                number of links — YouTube videos, research PDFs, images — and download them all
                as a single ZIP archive in one click.
              </p>
            </div>
            <div>
              <h2 className="text-foreground/50 font-semibold mb-2 text-sm">
                Supported File Types
              </h2>
              <p>
                PDFs, MP4 videos, MP3 audio, JPG/PNG images, Word docs, and any direct file
                link. YouTube videos are extracted via yt-dlp — no software installation
                required.
              </p>
            </div>
            <div>
              <h2 className="text-foreground/50 font-semibold mb-2 text-sm">Who Uses LinkZip?</h2>
              <p>
                Researchers downloading academic papers in bulk, students archiving course
                materials, developers collecting assets, and professionals building data sets.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {[
              "bulk url downloader",
              "youtube to zip",
              "pdf batch download",
              "multiple links downloader",
              "url to zip converter",
              "research paper downloader",
              "file bundler online",
              "download all links",
            ].map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 rounded-md bg-white/5 text-foreground/20 text-[10px] border border-white/5"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* ── Footer ────────────────────────────────── */}
        <footer className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-foreground/40 text-sm">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              className="w-8 h-8 object-contain rounded-lg shadow-lg"
              alt="LinkZip"
            />
            <div>
              <span className="font-bold tracking-tight text-white/80 block">LinkZip Pro</span>
              <span className="text-[10px]">© 2026 · Universal Bulk Downloader</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://linkzip-saas.vercel.app/sitemap.xml"
              className="hover:text-primary transition-colors"
            >
              Sitemap
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Terms
            </a>
            <div className="h-4 w-[1px] bg-white/10" />
            <a
              href="https://github.com/drdhavaltrivedi/linkzip-saas"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Globe size={14} /> GitHub
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
