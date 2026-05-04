import { NextRequest } from 'next/server';
import play from 'play-dl';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const formatId = req.nextUrl.searchParams.get('format');

  if (!url) {
    return new Response('Invalid YouTube URL', { status: 400 });
  }

  try {
    const info = await play.video_info(url);
    const videoTitle = (info.video_details.title || 'youtube_video').replace(/[^a-zA-Z0-9 _-]/g, '').trim();
    const filename = `${videoTitle}.mp4`;

    let directUrl: string | null = null;
    let contentLength: string | null = null;

    if (formatId && formatId !== 'best') {
      // Find the specific itag format
      const format = (await info.format).find(f => f.itag?.toString() === formatId);
      if (format && format.url) {
        directUrl = format.url;
        contentLength = format.contentLength || null;
      }
    }

    if (!directUrl) {
      // Fallback: pick the best combined format
      const bestCombined = (await info.format)
        .filter((f: any) => f.url && f.hasVideo && f.hasAudio)
        .sort((a: any, b: any) => (b.height || 0) - (a.height || 0))[0];
      
      if (bestCombined) {
        directUrl = bestCombined.url || null;
        contentLength = bestCombined.contentLength || null;
      }
    }

    if (!directUrl) {
      return new Response('No playable format found', { status: 404 });
    }

    // Stream server-side — the signed CDN URL is IP-bound to this server
    const streamRes = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com',
      },
    });

    if (!streamRes.ok) {
      return new Response(`Stream fetch failed: ${streamRes.status}`, { status: 502 });
    }

    const headers: HeadersInit = {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${filename}"`,
    };
    
    const finalContentLength = streamRes.headers.get('Content-Length') || contentLength;
    if (finalContentLength) headers['Content-Length'] = finalContentLength;

    return new Response(streamRes.body, { headers });
  } catch (error: any) {
    console.error('YT-DL ERROR:', error.message);
    return new Response('Failed to stream video: ' + error.message, { status: 500 });
  }
}
