"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Download, 
  Link as LinkIcon, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  FileArchive,
  Github as GithubIcon,
  Zap,
  Globe,
  Plus
} from "lucide-react";
import JSZip from "jszip";
import { cn } from "@/lib/utils";

interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  status: 'idle' | 'fetching' | 'downloading' | 'completed' | 'error';
  progress: number;
  error?: string;
  size?: number;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [isZipping, setIsZipping] = useState(false);

  const processLinks = async () => {
    const urls = input
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http"));

    if (urls.length === 0) return;

    setIsProcessing(true);
    setZipProgress(0);
    
    // Initial State
    const initialItems: DownloadItem[] = urls.map((url, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      url,
      filename: `Pending...`,
      status: 'idle',
      progress: 0,
    }));
    setItems(initialItems);

    // Step 1: Get Metadata (Server-side helper)
    try {
      const metaRes = await fetch("/api/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const { results } = await metaRes.json();
      
      setItems(prev => prev.map((item, i) => ({
        ...item,
        filename: results[i]?.filename || `file_${i+1}.pdf`,
        status: results[i]?.success ? 'downloading' : 'error',
        error: results[i]?.success ? undefined : results[i]?.error
      })));

      // Step 2: Client-side Download & ZIP
      const zip = new JSZip();
      setIsZipping(true);

      const downloadPromises = items.map(async (item, i) => {
        // Skip errors
        if (!results[i]?.success) return;

        try {
          const res = await fetch(item.url);
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
            
            setItems(prev => prev.map(p => p.url === item.url ? {
              ...p, 
              progress: contentLength ? Math.round((receivedLength / contentLength) * 100) : 50 
            } : p));
          }

          const blob = new Blob(chunks);
          zip.file(results[i].filename, blob);
          
          setItems(prev => prev.map(p => p.url === item.url ? {
            ...p, 
            status: 'completed',
            size: receivedLength
          } : p));
          
        } catch (err) {
          setItems(prev => prev.map(p => p.url === item.url ? {
            ...p, 
            status: 'error',
            error: "CORS or Network Error"
          } : p));
        }
      });

      await Promise.all(downloadPromises);

      // Final ZIP
      const content = await zip.generateAsync({ type: "blob" }, (metadata) => {
        setZipProgress(Math.round(metadata.percent));
      });

      const url = window.URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = "LinkZip_Bundle.zip";
      link.click();
      
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
      setIsZipping(false);
    }
  };

  return (
    <main className="min-h-screen relative p-6 md:p-12 lg:p-24 overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full blur-[128px] -z-10 animate-pulse" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] -z-10 animate-pulse" />

      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <header className="text-center space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-sm font-medium mb-4"
          >
            <Zap size={14} className="fill-current" />
            <span>Next-Gen Link Downloader</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight"
          >
            Zip your <span className="gradient-text">Research</span> in seconds.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-foreground/60 text-lg max-w-2xl mx-auto"
          >
            Paste a list of URLs, and we'll download, rename, and bundle them into a high-speed ZIP archive for you. Premium tools for serious research.
          </motion.p>
        </header>

        {/* Action Area */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-3xl p-8 space-y-6"
        >
          <div className="relative">
            <textarea
              placeholder="Paste your links here (one per line)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full h-48 bg-white/5 rounded-2xl p-6 text-foreground placeholder:text-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-white/10 resize-none"
            />
            <div className="absolute top-4 right-4 text-foreground/20 pointer-events-none">
               <LinkIcon size={24} />
            </div>
          </div>

          <button
            onClick={processLinks}
            disabled={isProcessing || !input.trim()}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-xl hover:shadow-primary/20",
              isProcessing ? "bg-white/10 cursor-not-allowed" : "gradient-bg text-white hover:scale-[1.01] active:scale-[0.99]"
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" />
                Processing {items.length} Links...
              </>
            ) : (
              <>
                <Download />
                Bundle & Zip Links
              </>
            )}
          </button>
        </motion.div>

        {/* Results / Progress */}
        <AnimatePresence>
          {items.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {items.map((item) => (
                <div key={item.id} className="glass glass-hover rounded-2xl p-4 flex items-center gap-4 group">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    item.status === 'completed' ? "bg-green-500/10 text-green-500" :
                    item.status === 'error' ? "bg-red-500/10 text-red-500" :
                    "bg-primary/10 text-primary"
                  )}>
                    {item.status === 'downloading' ? <Loader2 size={24} className="animate-spin" /> :
                     item.status === 'completed' ? <CheckCircle2 size={24} /> :
                     item.status === 'error' ? <AlertCircle size={24} /> :
                     <Globe size={24} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-sm">
                      {item.filename}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                       <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-primary" 
                            initial={{ width: 0 }}
                            animate={{ width: `${item.progress}%` }}
                          />
                       </div>
                       <span className="text-[10px] text-foreground/40 font-mono w-8">{item.progress}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-foreground/40 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white font-black text-xs">LZ</div>
            <span>© 2026 LinkZip SaaS. Premium Research Tools.</span>
          </div>
          <div className="flex items-center gap-8">
             <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
             <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
             <div className="h-4 w-[1px] bg-white/10" />
             <a href="#" className="flex items-center gap-2 hover:text-foreground transition-colors">
                <GithubIcon size={16} />
                GitHub
             </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
