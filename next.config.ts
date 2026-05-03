import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep youtube-dl-exec and tinyspawn unbundled so __dirname resolves to the
  // real node_modules path and the yt-dlp binary can be found at runtime.
  serverExternalPackages: ["youtube-dl-exec", "tinyspawn"],
};

export default nextConfig;
