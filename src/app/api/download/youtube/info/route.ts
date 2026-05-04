import { NextRequest } from 'next/server';
import play from 'play-dl';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return new Response('Missing URL', { status: 400 });

  try {
    const info = await play.video_info(url);
    const videoDetails = info.video_details;

    // Build a curated list of combined audio+video formats
    const formats: { formatId: string; label: string; height: number; ext: string; filesize: number | null }[] = [];

    // play-dl provides formats that we need to filter for combined ones
    // Note: YouTube often serves dash formats. play-dl helps us find the right ones.
    const allFormats = await info.format;
    
    const seen = new Set<string>();
    allFormats
      .filter((f: any) => f.url && f.hasVideo && f.hasAudio && f.qualityLabel)
      .sort((a: any, b: any) => (b.height || 0) - (a.height || 0))
      .forEach((f: any) => {
        const key = `${f.height}p`;
        if (!seen.has(key)) {
          seen.add(key);
          formats.push({
            formatId: f.itag?.toString() || 'best',
            label: f.qualityLabel || `${f.height}p`,
            height: f.height || 0,
            ext: 'mp4', // Most combined formats in play-dl are mp4 compatible
            filesize: f.contentLength ? parseInt(f.contentLength) : null
          });
        }
      });

    // Fallback: if no combined formats found via filter, add a 'best' option
    if (formats.length === 0) {
      formats.push({ formatId: 'best', label: 'Best Available', height: 0, ext: 'mp4', filesize: null });
    }

    return Response.json({
      title: videoDetails.title || 'Unknown Video',
      thumbnail: videoDetails.thumbnails?.[videoDetails.thumbnails.length - 1]?.url || '',
      duration: videoDetails.durationInSec || 0,
      uploader: videoDetails.channel?.name || '',
      viewCount: typeof videoDetails.views === 'number' ? videoDetails.views : parseInt(String(videoDetails.views || '0')),
      formats
    });

  } catch (error: any) {
    console.error('YT info error:', error.message);
    return new Response(error.message || 'Failed to fetch video info', { status: 500 });
  }
}
