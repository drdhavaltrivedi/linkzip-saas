import { NextRequest } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url || !ytdl.validateURL(url)) {
    return new Response('Invalid YouTube URL', { status: 400 });
  }

  try {
    // We proxy the stream through the server
    // Note: On Vercel, this is limited by the function timeout
    const stream = ytdl(url, {
      quality: 'highestvideo',
      filter: 'audioandvideo'
    });

    // Convert the readable stream to a web-compatible ReadableStream
    const { readable, writable } = new TransformStream();
    stream.pipe(writable as any);

    return new Response(readable as any, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="video.mp4"`
      }
    });
  } catch (error) {
    return new Response('Failed to stream video', { status: 500 });
  }
}
