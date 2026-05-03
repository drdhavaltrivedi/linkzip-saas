import { NextRequest } from 'next/server';
import ytdl from 'ytdl-core';
import { Readable } from 'stream';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url || !ytdl.validateURL(url)) {
    return new Response('Invalid YouTube URL', { status: 400 });
  }

  try {
    const stream = ytdl(url, {
      quality: 'highestvideo',
      filter: 'audioandvideo'
    });

    const webStream = Readable.toWeb(stream as any);

    return new Response(webStream as any, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="video.mp4"`
      }
    });
  } catch (error) {
    console.error("YTDL Error:", error);
    return new Response('Failed to stream video', { status: 500 });
  }
}
