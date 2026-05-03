export const runtime = 'edge';

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url');
  if (!url) return new Response('Missing URL', { status: 400 });

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': new URL(url).origin
      }
    });

    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        ...(response.headers.get('Content-Length') ? { 'Content-Length': response.headers.get('Content-Length')! } : {})
      }
    });
  } catch (err: any) {
    console.error('Proxy error:', err.message);
    return new Response('Proxy Error: ' + err.message, { status: 500 });
  }
}
