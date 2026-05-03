const axios = require('axios');

async function test() {
  const url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"; // Me at the zoo
  try {
    const response = await axios.post('https://api.cobalt.tools/api/json', {
      url: url,
      vQuality: "720",
      isAudioOnly: false
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log(response.data);
  } catch (err) {
    console.error(err.message);
    if(err.response) console.error(err.response.data);
  }
}
test();
