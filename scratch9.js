const youtubedl = require('youtube-dl-exec');

async function test() {
  const url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"; // Me at the zoo
  try {
    const output = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ]
    });
    
    console.log("Success! Extracted URL:", output.url || output.formats.find(f => f.ext === 'mp4' && f.acodec !== 'none' && f.vcodec !== 'none')?.url);
  } catch (err) {
    console.error("YT-DL ERROR:", err.message);
  }
}
test();
