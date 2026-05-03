import { NextRequest } from 'next/server';
import youtubedl from 'youtube-dl-exec';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return new Response('Invalid YouTube URL', { status: 400 });
  }

  try {
    // Step 1: Extract video info + all formats via yt-dlp
    const output = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:https://www.youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });

    const data: any = output;

    // Step 2: Find the best combined audio+video format (MP4 preferred)
    let directUrl: string | null = null;
    
    if (data.url) {
      // Single-format video (already combined)
      directUrl = data.url;
    } else if (data.formats && Array.isArray(data.formats)) {
      // Pick best combined MP4 format
      const mp4Combined = data.formats
        .filter((f: any) => f.url && f.ext === 'mp4' && f.acodec && f.acodec !== 'none' && f.vcodec && f.vcodec !== 'none')
        .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
      
      if (mp4Combined.length > 0) {
        directUrl = mp4Combined[0].url;
      } else {
        // Fallback: any combined format
        const anyFormat = data.formats.find((f: any) => f.url && f.acodec !== 'none' && f.vcodec !== 'none');
        directUrl = anyFormat?.url || null;
      }
    }

    if (!directUrl) {
      return new Response('No playable format found', { status: 404 });
    }

    // Step 3: Proxy the stream to the browser with correct headers
    const videoTitle = (data.title || 'video').replace(/[^a-zA-Z0-9 _-]/g, '').trim();
    const streamRes = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com'
      }
    });

    if (!streamRes.ok) {
      return new Response(`Stream fetch failed: ${streamRes.status}`, { status: 502 });
    }

    return new Response(streamRes.body, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${videoTitle}.mp4"`,
        ...(streamRes.headers.get('Content-Length') ? { 'Content-Length': streamRes.headers.get('Content-Length')! } : {})
      }
    });
  } catch (error: any) {
    console.error('YT-DL ERROR:', error.message);
    return new Response('Failed to stream video: ' + error.message, { status: 500 });
  }
}

