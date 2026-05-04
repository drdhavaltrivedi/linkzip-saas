import { NextRequest } from 'next/server';
import { Innertube, ClientType } from 'youtubei.js';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return new Response('Missing URL', { status: 400 });

  try {
    // Extract video ID from URL
    const videoId = url.match(/(?:v=|youtu\.be\/|shorts\/)([^&?/]+)/)?.[1];
    if (!videoId) return new Response('Invalid YouTube URL', { status: 400 });

    const yt = await Innertube.create({ generate_session_locally: true });
    const info = await yt.getBasicInfo(videoId, { client: ClientType.ANDROID });

    const videoDetails = info.basic_info;
    const formats: { formatId: string; label: string; height: number; ext: string; filesize: number | null }[] = [];

    // Combined formats (audio+video) — perfect for direct download
    const combinedFormats = info.streaming_data?.formats || [];
    const seen = new Set<string>();

    combinedFormats
      .sort((a: any, b: any) => (b.height || 0) - (a.height || 0))
      .forEach((f: any) => {
        const key = `${f.height || 0}p`;
        if (!seen.has(key)) {
          seen.add(key);
          formats.push({
            formatId: f.itag?.toString() || 'best',
            label: f.quality_label || `${f.height || '?'}p`,
            height: f.height || 0,
            ext: 'mp4',
            filesize: f.content_length ? parseInt(f.content_length) : null
          });
        }
      });

    if (formats.length === 0) {
      formats.push({ formatId: 'best', label: 'Best Available', height: 0, ext: 'mp4', filesize: null });
    }

    return Response.json({
      title: videoDetails.title || 'Unknown Video',
      thumbnail: videoDetails.thumbnail?.[videoDetails.thumbnail.length - 1]?.url || '',
      duration: videoDetails.duration || 0,
      uploader: videoDetails.channel?.name || videoDetails.author || '',
      viewCount: typeof videoDetails.view_count === 'number' ? videoDetails.view_count : parseInt(String(videoDetails.view_count || '0')),
      formats
    });

  } catch (error: any) {
    console.error('YT info error:', error.message);
    return new Response(error.message || 'Failed to fetch video info', { status: 500 });
  }
}
