//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						//stream from getUserMedia()
var rec; 							//Recorder.js object
var input; 							//MediaStreamAudioSourceNode we'll be recording

// shim for AudioContext when it's not avb. 
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext //audio context to help us record

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
//pauseButton.addEventListener("click", pauseRecording);

function startRecording() {
	console.log("recordButton clicked");
	recordButton.src = "./static/listening.png";
	instruction.innerHTML = "Listening Tap To Recognize";
	/*
		Simple constraints object, for more advanced audio features see
		https://addpipe.com/blog/audio-constraints-getusermedia/
	*/
    
    var constraints = { audio: true, video:false }

 	/*
    	Disable the record button until we get a success or fail from getUserMedia() 
	*/

	// recordButton.disabled = true;
	stopButton.disabled = false;
	// pauseButton.disabled = false

	/*
    	We're using the standard promise based getUserMedia() 
    	https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	*/

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		console.log("getUserMedia() success, stream created, initializing Recorder.js ...");

		/*
			create an audio context after getUserMedia is called
			sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
			the sampleRate defaults to the one set in your OS for your playback device

		*/
		audioContext = new AudioContext({sampleRate: 16000});

		//update the format 
		document.getElementById("formats").innerHTML="Format: 1 channel pcm @ "+audioContext.sampleRate/1000+"kHz"

		/*  assign to gumStream for later use  */
		gumStream = stream;
		
		/* use the stream */
		input = audioContext.createMediaStreamSource(stream);

		/* 
			Create the Recorder object and configure to record mono sound (1 channel)
			Recording 2 channels  will double the file size
		*/
		rec = new Recorder(input,{numChannels:1})

		//start the recording process
		rec.record()

		console.log("Recording started");

	}).catch(function(err) {
	  	//enable the record button if getUserMedia() fails
    	recordButton.src = "./static/tapToSpeak.png";
    	instruction.innerHTML = "Tap To Speak";
	});
}

function pauseRecording(){
	console.log("pauseButton clicked rec.recording=",rec.recording );
	if (rec.recording){
		//pause
		rec.stop();
		pauseButton.innerHTML="Resume";
	}else{
		//resume
		rec.record()
		pauseButton.innerHTML="Pause";

	}
}

function stopRecording() {
	console.log("stopButton clicked");

	//disable the stop button, enable the record too allow for new recordings
	recordButton.src = "./static/search.jpg";
	instruction.innerHTML = "Recognizing";
	//pauseButton.disabled = true;
	stopButton.disabled = true;
	//reset button just in case the recording is stopped while paused
	//pauseButton.innerHTML="Pause";
	
	//tell the recorder to stop the recording
	rec.stop();

	//stop microphone access
	gumStream.getAudioTracks()[0].stop();

	//create the wav blob and pass it on to createDownloadLink
	rec.exportWAV(doWhateverWithAudio);
}

function createDownloadLink(blob) {
	
	var url = URL.createObjectURL(blob);
	var au = document.createElement('audio');
	var li = document.createElement('li');
	var link = document.createElement('a');

	//name of .wav file to use during upload and download (without extendion)
	var filename = new Date().toISOString();

	//add controls to the <audio> element
	au.controls = true;
	au.src = url;

	//save to disk link
	link.href = url;
	link.download = filename+".wav"; //download forces the browser to donwload the file using the  filename
	link.innerHTML = "Save to disk";

	//add the new audio element to li
	li.appendChild(au);
	
	//add the filename to the li
	li.appendChild(document.createTextNode(filename+".wav "))

	//add the save to disk link to li
	li.appendChild(link);
	
	//upload link
	var upload = document.createElement('a');
	upload.href="#";
	upload.innerHTML = "Upload";
	upload.addEventListener("click", function(event){
		  var xhr=new XMLHttpRequest();
		  xhr.onload=function(e) {
		      if(this.readyState === 4) {
		          console.log("Server returned: ",e.target.responseText);
		      }
		  };
		  var fd=new FormData();
		  fd.append("audio_data",blob, filename);
		  xhr.open("POST","upload.php",true);
		  xhr.send(fd);
	})
	li.appendChild(document.createTextNode (" "))//add a space in between
	li.appendChild(upload)//add the upload link to li

	//add the li element to the ol
	recordingsList.appendChild(li);
}

function doWhateverWithAudio(audioBlob){

    //.... send to server, downlod, etc.
	console.log(audioBlob)
    const mime = audioBlob.type;
    const ext = mime.slice(mime.lastIndexOf("/") + 1, mime.length);
    console.log(mime,ext);
    const file = new File([audioBlob], `Query.${ext}`, {
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
  responsetxt.innerHTML= response.headers.get('result');
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
        player.play();
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