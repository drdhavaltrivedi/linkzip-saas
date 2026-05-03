const play = require('play-dl');

async function test() {
  const url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"; // Me at the zoo
  try {
    const info = await play.video_info(url);
    console.log("Info success:", info.video_details.title);
    const stream = await play.stream_from_info(info);
    console.log("Stream successfully extracted!");
    console.log("Type:", stream.type);
  } catch (err) {
    console.error("PLAY-DL ERROR:", err.message);
  }
}
test();
