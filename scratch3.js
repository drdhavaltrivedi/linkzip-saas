const ytdl = require('@distube/ytdl-core');

async function test() {
  const url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"; // Me at the zoo
  try {
    const stream = ytdl(url, { quality: 'highestvideo', filter: 'audioandvideo' });
    stream.on('info', (info) => console.log('Info obtained'));
    stream.on('error', (err) => console.error('YTDL ERROR:', err));
    let chunks = 0;
    stream.on('data', () => chunks++);
    stream.on('end', () => console.log('Done, chunks:', chunks));
  } catch (err) {
    console.error(err);
  }
}
test();
