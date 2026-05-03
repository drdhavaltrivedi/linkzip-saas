import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'Invalid URLs provided' }, { status: 400 });
    }

    // Since we are running on Vercel, we can't easily do a long-running ZIP generation
    // and stream it back without a specialized service or complexity.
    // However, for this SaaS, we will process small batches or provide a logic
    // that the client-side can also help with.
    
    // For the "SaaS" feel, we'll implement a robust extraction logic.
    const results = await Promise.all(urls.map(async (url, index) => {
      try {
        const response = await fetch(url, {
          method: 'HEAD', // Just get headers first
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        let filename = `file_${index + 1}`;
        
        // 1. Content-Disposition
        const cd = response.headers.get('content-disposition');
        if (cd) {
          const match = cd.match(/filename=(.+)/);
          if (match) filename = match[1].replace(/["']/g, '');
        } else {
          // 2. URL Path
          const path = new URL(url).pathname;
          const base = path.split('/').pop();
          if (base && base.includes('.')) filename = base;
        }

        return { url, filename, success: true };
      } catch (err) {
        return { url, success: false, error: 'Failed to reach URL' };
      }
    }));

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
