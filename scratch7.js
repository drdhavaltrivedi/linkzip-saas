const play = require('play-dl');

async function test() {
  const url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"; // Me at the zoo
  try {
    const stream = await play.stream(url, { quality: 2 }); // quality 2 is typically 720p/1080p video + audio
    console.log("Stream successfully extracted!");
    console.log("Type:", stream.type);
    
    // Just verify the stream starts receiving data
    stream.stream.on('data', (chunk) => {
        console.log("Received chunk of size:", chunk.length);
        stream.stream.destroy(); // Stop after first chunk to succeed the test
    });
  } catch (err) {
    console.error("PLAY-DL ERROR:", err.message);
  }
}
test();
