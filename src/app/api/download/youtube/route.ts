import { NextRequest } from 'next/server';
import youtubedl from 'youtube-dl-exec';
import { Readable } from 'stream';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return new Response('Invalid YouTube URL', { status: 400 });
  }

  try {
    const output = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ]
    });

    const directUrl = output.url || output.formats.find((f: any) => f.ext === 'mp4' && f.acodec !== 'none' && f.vcodec !== 'none')?.url;

    if (!directUrl) {
      throw new Error("Could not extract direct URL");
    }

    // Proxy the stream to bypass CORS
    const response = await fetch(directUrl);
    
    if (!response.ok) {
        throw new Error("Failed to fetch stream from YouTube");
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="video.mp4"`
      }
    });
  } catch (error) {
    console.error("YT-DL ERROR:", error);
    return new Response('Failed to stream video', { status: 500 });
  }
}
