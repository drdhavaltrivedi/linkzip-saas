import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinkZip Pro - Universal Link & Video Downloader | Bundle PDFs, YouTube, & Files",
  description: "The ultimate tool to download and bundle YouTube videos, research papers, PDFs, and files from multiple links into a single high-speed ZIP archive. Perfect for researchers and students.",
  keywords: [
    "LinkZip", "bulk downloader", "youtube downloader", "pdf batch download", 
    "multiple links to zip", "research paper downloader", "url to zip", 
    "file bundle tool", "fast parallel download"
  ],
  authors: [{ name: "LinkZip SaaS" }],
  creator: "LinkZip Pro",
  publisher: "LinkZip SaaS Platform",
  category: "technology",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://linkzip-saas.vercel.app",
  },
  openGraph: {
    title: "LinkZip Pro - Universal Bulk Downloader",
    description: "Paste a list of links and download everything into one ZIP archive instantly. Supports YouTube, PDFs, and all file formats.",
    url: "https://linkzip-saas.vercel.app",
    siteName: "LinkZip",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 800,
        alt: "LinkZip Pro Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkZip Pro - Bundle Links to ZIP",
    description: "Download and ZIP bulk links effortlessly.",
    images: ["/logo.png"],
    creator: "@LinkZipApp",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: "/icon.png",
    apple: "/logo.png",
  },
  manifest: "/manifest.json",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "LinkZip Pro",
  "operatingSystem": "Web Browser",
  "applicationCategory": "UtilitiesApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "description": "A web-based SaaS platform that allows users to paste multiple URLs (including YouTube and PDFs) and downloads them all into a single, organized ZIP archive.",
  "url": "https://linkzip-saas.vercel.app"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
