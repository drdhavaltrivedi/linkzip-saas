import { NextRequest } from 'next/server';
import youtubedl from 'youtube-dl-exec';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const formatId = req.nextUrl.searchParams.get('format');

  if (!url) {
    return new Response('Invalid YouTube URL', { status: 400 });
  }

  try {
    const ytdlArgs: any = {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: !formatId,
      addHeader: [
        'referer:https://www.youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ],
    };
    if (formatId && formatId !== 'best') {
      ytdlArgs.format = formatId;
    }

    const output = await youtubedl(url, ytdlArgs);

    const data: any = output;

    // Resolve the direct stream URL
    let directUrl: string | null = null;

    if (data.url) {
      directUrl = data.url;
    } else if (data.formats && Array.isArray(data.formats)) {
      const mp4Combined = data.formats
        .filter(
          (f: any) =>
            f.url && f.ext === 'mp4' &&
            f.acodec && f.acodec !== 'none' &&
            f.vcodec && f.vcodec !== 'none',
        )
        .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

      if (mp4Combined.length > 0) {
        directUrl = mp4Combined[0].url;
      } else {
        const anyFormat = data.formats.find(
          (f: any) => f.url && f.acodec !== 'none' && f.vcodec !== 'none',
        );
        directUrl = anyFormat?.url || null;
      }
    }

    if (!directUrl) {
      return new Response('No playable format found', { status: 404 });
    }

    const videoTitle = (data.title || 'youtube_video').replace(/[^a-zA-Z0-9 _-]/g, '').trim();
    const filename = `${videoTitle}.mp4`;

    // Stream server-side — the signed CDN URL is IP-bound to this server,
    // so the browser can't fetch it directly (CORS + IP mismatch).
    const streamRes = await fetch(directUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
    const cl = streamRes.headers.get('Content-Length');
    if (cl) headers['Content-Length'] = cl;

    return new Response(streamRes.body, { headers });
  } catch (error: any) {
    const msg = error?.stderr || error?.shortMessage || error?.message || String(error);
    console.error('YT-DL ERROR:', msg);
    return new Response('Failed to stream video: ' + msg, { status: 500 });
  }
}
