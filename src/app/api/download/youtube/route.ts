import { NextRequest } from 'next/server';
import { Innertube, ClientType } from 'youtubei.js';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const formatId = req.nextUrl.searchParams.get('format');

  if (!url) return new Response('Invalid YouTube URL', { status: 400 });

  try {
    // Extract video ID
    const videoId = url.match(/(?:v=|youtu\.be\/|shorts\/)([^&?/]+)/)?.[1];
    if (!videoId) return new Response('Invalid YouTube URL format', { status: 400 });

    const yt = await Innertube.create({ generate_session_locally: true });
    const info = await yt.getBasicInfo(videoId, { client: ClientType.ANDROID });

    const title = (info.basic_info.title || 'youtube_video').replace(/[^a-zA-Z0-9 _-]/g, '').trim();
    const filename = `${title}.mp4`;

    // Use youtubei.js's own streaming — it handles n-parameter decryption correctly
    const downloadOptions: any = {
      type: 'videoandaudio',
      quality: 'best',
      format: 'mp4',
      client: ClientType.ANDROID
    };

    // If a specific itag was requested, pick that format
    if (formatId && formatId !== 'best') {
      const combinedFormats = info.streaming_data?.formats || [];
      const chosenFormat = combinedFormats.find((f: any) => f.itag?.toString() === formatId);
      if (chosenFormat) {
        // Override quality selection by using specific itag
        downloadOptions.itag = parseInt(formatId);
      }
    }

    const stream = await yt.download(videoId, downloadOptions);

    return new Response(stream as any, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    });

  } catch (error: any) {
    console.error('YT download error:', error.message);
    return new Response('Failed to download video: ' + error.message, { status: 500 });
  }
}
