import { NextRequest, NextResponse } from 'next/server';
import { Innertube, ClientType } from 'youtubei.js';

export async function POST(req: NextRequest) {
  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'Invalid URLs provided' }, { status: 400 });
    }

    const results = await Promise.all(urls.map(async (url, index) => {
      try {
        // Check if it's a YouTube URL
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
        
        if (isYouTube) {
          try {
            // youtubei.js ANDROID client bypasses all bot-detection on cloud IPs
            const videoId = url.match(/(?:v=|youtu\.be\/|shorts\/)([^&?/]+)/)?.[1];
            if (!videoId) throw new Error('Cannot extract video ID');
            const yt = await Innertube.create({ generate_session_locally: true });
            const info = await yt.getBasicInfo(videoId, { client: ClientType.ANDROID });
            return { 
              url, 
              filename: `${info.basic_info.title || 'youtube_video'}.mp4`, 
              success: true, 
              type: 'video',
              thumbnail: info.basic_info.thumbnail?.[info.basic_info.thumbnail.length - 1]?.url || null
            };
          } catch (ytErr: any) {
            console.error("Meta YT error:", ytErr.message);
            const videoId = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1] || 'video';
            return {
              url,
              filename: `youtube_${videoId}.mp4`,
              success: true,
              type: 'video',
              thumbnail: null
            };
          }
        }

        const response = await fetch(url, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        let filename = `file_${index + 1}`;
        const cd = response.headers.get('content-disposition');
        if (cd) {
          const match = cd.match(/filename=(.+)/);
          if (match) filename = match[1].replace(/["']/g, '');
        } else {
          const path = new URL(url).pathname;
          const base = path.split('/').pop();
          if (base && base.includes('.')) filename = base;
        }

        // Detect type based on extension
        let type = 'file';
        if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) type = 'image';
        if (filename.match(/\.(pdf)$/i)) type = 'pdf';
        if (filename.match(/\.(mp4|mkv|webm)$/i)) type = 'video';
        if (filename.match(/\.(mp3|wav|ogg)$/i)) type = 'audio';

        return { url, filename, success: true, type };
      } catch (err) {
        return { url, success: false, error: 'Failed to reach URL' };
      }
    }));

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
