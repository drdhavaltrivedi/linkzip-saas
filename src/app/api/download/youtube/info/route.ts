import { NextRequest } from 'next/server';
import youtubedl from 'youtube-dl-exec';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return new Response('Missing URL', { status: 400 });

  try {
    const output = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      addHeader: [
        'referer:https://www.youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });

    const data: any = output;

    // Build a curated list of combined audio+video formats
    const formats: { formatId: string; label: string; height: number; ext: string; filesize: number | null }[] = [];

    if (data.formats && Array.isArray(data.formats)) {
      const seen = new Set<string>();
      data.formats
        .filter((f: any) => f.url && f.acodec && f.acodec !== 'none' && f.vcodec && f.vcodec !== 'none' && f.height)
        .sort((a: any, b: any) => (b.height || 0) - (a.height || 0))
        .forEach((f: any) => {
          const key = `${f.height}p`;
          if (!seen.has(key)) {
            seen.add(key);
            formats.push({
              formatId: f.format_id,
              label: `${f.height}p ${f.ext?.toUpperCase() || 'MP4'}`,
              height: f.height,
              ext: f.ext || 'mp4',
              filesize: f.filesize || f.filesize_approx || null
            });
          }
        });
    }

    // Fallback: single URL format
    if (formats.length === 0 && data.url) {
      formats.push({ formatId: 'best', label: 'Best Available', height: 0, ext: 'mp4', filesize: null });
    }

    return Response.json({
      title: data.title || 'Unknown Video',
      thumbnail: data.thumbnail || '',
      duration: data.duration || 0,
      uploader: data.uploader || data.channel || '',
      viewCount: data.view_count || 0,
      formats
    });

  } catch (error: any) {
    console.error('YT info error:', error.message);
    return new Response(error.message || 'Failed to fetch video info', { status: 500 });
  }
}
