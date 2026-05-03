"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Download, 
  Link as LinkIcon, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  FileArchive,
  Zap,
  Globe,
  Plus,
  Video,
  Music,
  FileText,
  Image as ImageIcon,
  Layers,
  File as FileIcon
} from "lucide-react";
import JSZip from "jszip";
import { cn } from "@/lib/utils";

interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  status: 'idle' | 'fetching' | 'downloading' | 'completed' | 'error';
  progress: number;
  type: string;
  error?: string;
  size?: number;
  thumbnail?: string;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'batch' | 'single'>('batch');
  const [isZipping, setIsZipping] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={20} />;
      case 'audio': return <Music size={20} />;
      case 'pdf': return <FileText size={20} />;
      case 'image': return <ImageIcon size={20} />;
      default: return <FileIcon size={20} />;
    }
  };

  const processLinks = async () => {
    const urls = input
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http"));

    if (urls.length === 0) return;

    setIsProcessing(true);
    
    // Initial State
    const initialItems: DownloadItem[] = urls.map((url, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      url,
      filename: `Pending...`,
      status: 'idle',
      progress: 0,
      type: 'file'
    }));
    setItems(initialItems);

    try {
      const metaRes = await fetch("/api/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const { results } = await metaRes.json();
      
      const zip = new JSZip();
      
      const processedItems: DownloadItem[] = items.map((item, i) => ({
        ...item,
        filename: results[i]?.filename || `file_${i+1}`,
        status: (results[i]?.success ? 'downloading' : 'error') as DownloadItem['status'],
        type: results[i]?.type || 'file',
        thumbnail: results[i]?.thumbnail,
        error: results[i]?.success ? undefined : results[i]?.error
      }));
      setItems(processedItems);

      const downloadPromises = processedItems.map(async (item, i) => {
        if (!results[i]?.success) return;

        try {
          const downloadUrl = item.type === 'video' && (item.url.includes('youtube.com') || item.url.includes('youtu.be'))
            ? `/api/download/youtube?url=${encodeURIComponent(item.url)}`
            : `/api/proxy?url=${encodeURIComponent(item.url)}`;

          const res = await fetch(downloadUrl);
          if (!res.ok) throw new Error("Failed to download");
          
          const reader = res.body?.getReader();
          const contentLength = +(res.headers.get('Content-Length') || 0);
          
          let receivedLength = 0;
          const chunks = [];
          
          while(true) {
            const {done, value} = await reader!.read();
            if (done) break;
            chunks.push(value);
            receivedLength += value.length;
            
            setItems(prev => prev.map(p => p.id === item.id ? {
              ...p, 
              progress: contentLength ? Math.round((receivedLength / contentLength) * 100) : 50 
            } : p));
          }

          const blob = new Blob(chunks);
          
          if (mode === 'batch') {
            zip.file(item.filename, blob);
          } else if (urls.length === 1) {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = item.filename;
            link.click();
          }

          setItems(prev => prev.map(p => p.id === item.id ? {
            ...p, 
            status: 'completed',
            size: receivedLength
          } : p));
          
        } catch (err) {
          setItems(prev => prev.map(p => p.id === item.id ? {
            ...p, 
            status: 'error',
            error: "Download Failed"
          } : p));
        }
      });

      await Promise.all(downloadPromises);

      if (mode === 'batch') {
        setIsZipping(true);
        const content = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(content);
        const link = document.createElement("a");
        link.href = url;
        link.download = "LinkZip_Bundle.zip";
        link.click();
        setIsZipping(false);
      }
      
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen relative p-6 md:p-12 lg:p-24 overflow-hidden">
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full blur-[128px] -z-10 animate-pulse" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] -z-10 animate-pulse" />

      <div className="max-w-5xl mx-auto space-y-12">
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
            className="text-5xl md:text-7xl font-bold tracking-tight"
          >
            Universal <span className="gradient-text">Downloader</span>
          </motion.h1>
          <p className="text-foreground/60 text-lg max-w-2xl mx-auto">
            YouTube videos, research papers, and media. One click to bundle them all.
          </p>
        </header>

        {/* Mode Toggle */}
        <div className="flex justify-center">
          <div className="bg-white/5 p-1 rounded-2xl flex border border-white/10">
            <button 
              onClick={() => setMode('batch')}
              className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2", mode === 'batch' ? "bg-primary text-white" : "text-foreground/40 hover:text-foreground/60")}
            >
              <Layers size={16} /> Batch ZIP
            </button>
            <button 
              onClick={() => setMode('single')}
              className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2", mode === 'single' ? "bg-primary text-white" : "text-foreground/40 hover:text-foreground/60")}
            >
              <Download size={16} /> Single Direct
            </button>
          </div>
        </div>

        <motion.div className="glass rounded-3xl p-8 space-y-6">
          <textarea
            placeholder={mode === 'batch' ? "Paste multiple links (one per line)..." : "Paste a single YouTube or file link..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-48 bg-white/5 rounded-2xl p-6 text-foreground placeholder:text-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-white/10 resize-none"
          />
          <button
            onClick={processLinks}
            disabled={isProcessing || !input.trim()}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-xl",
              isProcessing ? "bg-white/10 cursor-not-allowed" : "gradient-bg text-white hover:scale-[1.01] active:scale-[0.99]"
            )}
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : mode === 'batch' ? <FileArchive /> : <Download />}
            {isProcessing ? "Processing Bundle..." : mode === 'batch' ? "Download All in One ZIP" : "Download Now"}
          </button>
          {mode === 'batch' && (
            <p className="text-center text-xs text-foreground/30 flex items-center justify-center gap-1">
              <CheckCircle2 size={12} /> All PDFs, videos, and files will be bundled into a single ZIP archive.
            </p>
          )}
        </motion.div>

        <AnimatePresence>
          {items.length > 0 && (
            <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item) => (
                <div key={item.id} className="glass glass-hover rounded-2xl p-4 flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden",
                    item.status === 'completed' ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
                  )}>
                    {item.thumbnail ? <img src={item.thumbnail} className="w-full h-full object-cover" /> : getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-sm">{item.filename}</p>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                      <motion.div className="h-full bg-primary" animate={{ width: `${item.progress}%` }} />
                    </div>
                  </div>
                  {item.status === 'completed' && <CheckCircle2 className="text-green-500" size={20} />}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* SEO Content Block — visible to search engines, subtle to users */}
        <section className="mt-16 pt-12 border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-foreground/30 text-xs leading-relaxed">
            <div>
              <h2 className="text-foreground/50 font-semibold mb-2 text-sm">What is LinkZip Pro?</h2>
              <p>LinkZip is the fastest bulk URL downloader and ZIP bundler available online. Paste any number of links — YouTube videos, research PDFs, academic papers, images — and download them all as a single ZIP archive in one click.</p>
            </div>
            <div>
              <h2 className="text-foreground/50 font-semibold mb-2 text-sm">Supported File Types</h2>
              <p>Works with PDFs, MP4 videos, MP3 audio, JPG/PNG images, Word docs, and any other direct file link. YouTube videos are supported via yt-dlp extraction. Multiple links to ZIP — no software installation required.</p>
            </div>
            <div>
              <h2 className="text-foreground/50 font-semibold mb-2 text-sm">Who Uses LinkZip?</h2>
              <p>Researchers downloading academic papers in bulk, students archiving course materials, developers collecting assets, and professionals building data sets. Available globally — works in USA, India, UK, Europe, and worldwide.</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {["bulk url downloader", "youtube to zip", "pdf batch download", "multiple links downloader", "url to zip converter", "research paper downloader", "file bundler online", "download all links"].map(tag => (
              <span key={tag} className="px-2 py-1 rounded-md bg-white/5 text-foreground/20 text-[10px] border border-white/5">{tag}</span>
            ))}
          </div>
        </section>

        <footer className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-foreground/40 text-sm">
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="w-8 h-8 object-contain rounded-lg shadow-lg" alt="LinkZip" />
            <div>
              <span className="font-bold tracking-tight text-white/80 block">LinkZip Pro</span>
              <span className="text-[10px]">© 2026 · Universal Bulk Downloader</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
             <a href="https://linkzip-saas.vercel.app/sitemap.xml" className="hover:text-primary transition-colors">Sitemap</a>
             <a href="#" className="hover:text-primary transition-colors">Privacy</a>
             <a href="#" className="hover:text-primary transition-colors">Terms</a>
             <div className="h-4 w-[1px] bg-white/10" />
             <a href="https://github.com/drdhavaltrivedi/linkzip-saas" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground transition-colors">
                <Globe size={14} /> GitHub
             </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
