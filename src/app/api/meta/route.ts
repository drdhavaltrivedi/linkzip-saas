import { NextRequest, NextResponse } from 'next/server';
import play from 'play-dl';

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
            // play-dl is much more reliable on cloud IPs than yt-dlp
            const info = await play.video_info(url);
            return { 
              url, 
              filename: `${info.video_details.title || 'youtube_video'}.mp4`, 
              success: true, 
              type: 'video',
              thumbnail: info.video_details.thumbnails?.[info.video_details.thumbnails.length - 1]?.url || null
            };
          } catch (ytErr: any) {
            console.error("Meta play-dl error:", ytErr.message);
            // Fallback: still mark as video so download routes correctly
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
