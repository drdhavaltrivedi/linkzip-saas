const ytdl = require('ytdl-core');
const { Readable } = require('stream');

async function test() {
  const url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"; // Me at the zoo
  const stream = ytdl(url, { quality: 'highestvideo', filter: 'audioandvideo' });
  const webStream = Readable.toWeb(stream);
  console.log("Success");
}
test().catch(console.error);
