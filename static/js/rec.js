function audioBufferToWav (buffer, opt) {
    opt = opt || {}
  
    var numChannels = buffer.numberOfChannels
    var sampleRate = buffer.sampleRate
    var format = opt.float32 ? 3 : 1
    var bitDepth = format === 3 ? 32 : 16
    
    var result
    if (numChannels === 2) {
      result = interleave(buffer.getChannelData(0), buffer.getChannelData(1))
    } else {
      result = buffer.getChannelData(0)
    }
  
    return encodeWAV(result, format, sampleRate, numChannels, bitDepth)
  }
  
  function encodeWAV (samples, format, sampleRate, numChannels, bitDepth) {
    var bytesPerSample = bitDepth / 8
    var blockAlign = numChannels * bytesPerSample
  
    var buffer = new ArrayBuffer(44 + samples.length * bytesPerSample)
    var view = new DataView(buffer)
  
    /* RIFF identifier */
    writeString(view, 0, 'RIFF')
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * bytesPerSample, true)
    /* RIFF type */
    writeString(view, 8, 'WAVE')
    /* format chunk identifier */
    writeString(view, 12, 'fmt ')
    /* format chunk length */
    view.setUint32(16, 16, true)
    /* sample format (raw) */
    view.setUint16(20, format, true)
    /* channel count */
    view.setUint16(22, numChannels, true)
    /* sample rate */
    view.setUint32(24, sampleRate, true)
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * blockAlign, true)
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, blockAlign, true)
    /* bits per sample */
    view.setUint16(34, bitDepth, true)
    /* data chunk identifier */
    writeString(view, 36, 'data')
    /* data chunk length */
    view.setUint32(40, samples.length * bytesPerSample, true)
    if (format === 1) { // Raw PCM
      floatTo16BitPCM(view, 44, samples)
    } else {
      writeFloat32(view, 44, samples)
    }
  
    return buffer
  }
  
  function interleave (inputL, inputR) {
    var length = inputL.length + inputR.length
    var result = new Float32Array(length)
  
    var index = 0
    var inputIndex = 0
  
    while (index < length) {
      result[index++] = inputL[inputIndex]
      result[index++] = inputR[inputIndex]
      inputIndex++
    }
    return result
  }
  
  function writeFloat32 (output, offset, input) {
    for (var i = 0; i < input.length; i++, offset += 4) {
      output.setFloat32(offset, input[i], true)
    }
  }
  
  function floatTo16BitPCM (output, offset, input) {
    for (var i = 0; i < input.length; i++, offset += 2) {
      var s = Math.max(-1, Math.min(1, input[i]))
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    }
  }
  
  function writeString (view, offset, string) {
    for (var i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

//-------------------------All variables are placed here ----------------------------
var rec;
var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
stopButton.disabled = true;
var instruction = document.getElementById("instructionText");
//var pauseButton = document.getElementById("pauseButton");
var querytxt = document.getElementById("querytext");
var responsetxt = document.getElementById("queryresponse");
//add events to those 2 buttons
recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
//-------------------------Acessing system mic and recording audio-------------------

  function startRecording() {
    console.log("recordButton clicked");
    recordButton.src = "./static/listening.png";
    instruction.innerHTML = "Listening Tap To Recognize";
	
    var constraints = { audio: true, video:false }

	  stopButton.disabled = false;
	
	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		console.log("getUserMedia() success, stream created, initializing Recorder.js ...");

        var audioCtx = new (window.AudioContext || window.webkitAudioContext)({sampleRate: 16000});
		
		//update the format 
    
		document.getElementById("formats").innerHTML="Format: 1 channel pcm @ "+audioCtx.sampleRate/1000+"kHz"

        rec = new MediaRecorder(stream,{
            mimeType : 'audio/webm',
            codecs : "opus",
        });
		const audioChunks = [];

        rec.ondataavailable = e => {
          console.log("Inside on dataavailable")
            audioChunks.push(e.data);
            if (rec.state == "inactive") {

                var blob = new Blob(audioChunks, { 'type': 'audio/webm; codecs=opus' });
                var arrayBuffer;
                var fileReader = new FileReader();
                fileReader.onload = function(event) {
                    arrayBuffer = event.target.result;
                };
                fileReader.readAsArrayBuffer(blob);
                fileReader.onloadend=function(d){
                    audioCtx.decodeAudioData(
                        fileReader.result,
                        function(buffer) {
                            var wav = audioBufferToWav(buffer);
                            setTimeout(() => doWhateverWithAudio(wav), 1);
                        },
                        function(e){ console.log( e); }
                    );
                };
            }
        }

		//Starting recording
		rec.start()

		console.log("Recording started");

	}).catch(function(err) {
	  	//enable the record button if getUserMedia() fails
      console.log("Error", err);
    	recordButton.src = "./static/tapToSpeak.png";
    	instruction.innerHTML = "Tap To Speak";
      stopButton.disabled = true;
	});
}

//-------------------------Adding function to fire stop recording ---------------------

function stopRecording() {
	console.log("stopButton clicked");

	//disable the stop button, enable the record too allow for new recordings
	recordButton.src = "./static/search.jpg";
	instruction.innerHTML = "Recognizing";
	//pauseButton.disabled = true;
	stopButton.disabled = true;
	
	//tell the recorder to stop the recording
	rec.stop();

}

//-------------------------Making API call and rendering audio---------------------
function doWhateverWithAudio(audio){

  //.... send to server, downlod, etc.
  console.log("File",audio)
  var audioBlob = new Blob([audio], {'type': 'audio/wav'});
  const mime = audioBlob.type;
  const id = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  const ext = mime.slice(mime.lastIndexOf("/") + 1, mime.length);
  console.log(mime,ext);
  const file = new File([audioBlob], `Query${id}.${ext}`, {
  type: mime,
  });

  const formData = new FormData();
  formData.append('file', file);

  fetch("/save", {
  method: 'POST',
  body: formData
  })

// Retrieve its body as ReadableStream
.then((response) => {
const reader = response.body.getReader();
querytxt.innerHTML = response.headers.get('query');
responsetxt.innerHTML= "AI:> "+response.headers.get('result');
document.getElementById('response').style.display = 'block';
return new ReadableStream({
start(controller) {
  return pump();
  function pump() {
  return reader.read().then(({ done, value }) => {
    // When no more data needs to be consumed, close the stream
    if (done) {
    controller.close();
    return;
    }
    // Enqueue the next data chunk into our target stream
    controller.enqueue(value);
    return pump();
  });
  }
}
})
})
// Create a new response out of the stream
.then((stream) => new Response(stream))
// Create an object URL for the response
.then((response) => response.blob())
.then((audioBlob) => {
  console.log('Success:', audioBlob);

    recordButton.src = "./static/speak.gif";
    instruction.innerHTML = "Recognized";

      const player = new Audio();
      player.src = URL.createObjectURL(audioBlob);;
      player.play().catch((error) => {
        console.error('Error:', error);
        recordButton.src = "./static/tapToSpeak.png";
        instruction.innerHTML = "Tap To Speak";
        querytxt.innerHTML = `Error occured - ${error}`;
      });
    player.addEventListener("ended",()=>{
    console.log("Player ended");
    recordButton.src = "./static/tapToSpeak.png";
      instruction.innerHTML = "Tap To Speak";
  });
  
})
.catch((error) => {
  console.error('Error:', error);
  recordButton.src = "./static/tapToSpeak.png";
    instruction.innerHTML = "Tap To Speak";
});
  
}