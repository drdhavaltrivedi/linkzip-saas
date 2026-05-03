import { NextRequest } from 'next/server';
import youtubedl from 'youtube-dl-exec';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return new Response('Invalid YouTube URL', { status: 400 });
  }

  try {
    // Extract the direct streamable URL via yt-dlp
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

    // Find the best combined audio+video format (MP4 preferred)
    let directUrl: string | null = null;

    if (data.url) {
      directUrl = data.url;
    } else if (data.formats && Array.isArray(data.formats)) {
      const mp4Combined = data.formats
        .filter((f: any) => f.url && f.ext === 'mp4' && f.acodec && f.acodec !== 'none' && f.vcodec && f.vcodec !== 'none')
        .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

      if (mp4Combined.length > 0) {
        directUrl = mp4Combined[0].url;
      } else {
        const anyFormat = data.formats.find((f: any) => f.url && f.acodec !== 'none' && f.vcodec !== 'none');
        directUrl = anyFormat?.url || null;
      }
    }

    if (!directUrl) {
      return new Response('No playable format found', { status: 404 });
    }

    // Return the direct URL as JSON — the client will download it directly
    // This avoids Vercel's function bandwidth limits and timeout issues
    const videoTitle = (data.title || 'youtube_video').replace(/[^a-zA-Z0-9 _-]/g, '').trim();
    return Response.json({ url: directUrl, title: videoTitle, filename: `${videoTitle}.mp4` });

  } catch (error: any) {
    console.error('YT-DL ERROR:', error.message);
    return new Response('Failed to extract video: ' + error.message, { status: 500 });
  }
}
