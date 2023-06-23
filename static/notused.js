

//This is our main function which will start the recording
function startRecording() {
	console.log("startRecording() called");
    var tapToSpeakimg = document.getElementById("tapToSpeak");
    tapToSpeakimg.src = "./static/speak.gif";
    tapToSpeakimg.onclick = null
    document.getElementById("instructionText").innerHTML = "Speak Now";
    startRecordin();
    
    }


    // function startRecordin(){
    //     var audioContext = new (window.AudioContext || window.webkitAudioContext)();
    //     var mediaStreamSource = null;
    //     var recorder = null;
        
    //     // Start recording
    //     navigator.mediaDevices.getUserMedia({ audio: true })
    //       .then(function (stream) {
    //         mediaStreamSource = audioContext.createMediaStreamSource(stream);
    //         recorder = new MediaRecorder(stream);
        
    //         recorder.ondataavailable = function (e) {
    //           var audioBlob = new Blob([e.data], { type: 'audio/ogg; codecs=opus' });
    //           // do something with audioBlob, like send to server
    //         };
        
    //         recorder.start();
    //         // detect silence
    //         var silenceDetector = audioContext.createScriptProcessor(4096, 1, 1);
    //         var silenceThreshold = -50;  // adjust as needed
    //         var silenceTime = 0;
    //         var silenceMax = 3;  // time in seconds after which recording will pause
    //         silenceDetector.onaudioprocess = function (event) {
    //           var input = event.inputBuffer.getChannelData(0);
    //           var max = Math.max.apply(null, input);
    //           if (max < silenceThreshold) {
    //             silenceTime += event.inputBuffer.duration;
    //             if (silenceTime > silenceMax) {
    //               recorder.stop();
    //               silenceDetector.disconnect();
    //             }
    //           } else {
    //             silenceTime = 0;
    //           }
    //         };
    //         mediaStreamSource.connect(silenceDetector);
    //         silenceDetector.connect(audioContext.destination);

    //         //stop event:
    //         recorder.addEventListener('stop', () => {
                
    //             //stop all the tracks:
    //             console.log('STOP event listner called');
    //             stream.getTracks().forEach(track => track.stop());
    //             //  if(!anySoundDetected) return;
                
    //             //send to server:
    //             const audioBlob = new Blob(audioChunks, {'type': 'audio/mp3'});
    //             doWhateverWithAudio(audioBlob);
                
    //             //start recording again:
    //             //record();

    //         });

    //       })
    //       .catch(function (err) {
    //         console.error('Cannot access microphone', err);
    //       });
        
    // }

//startRecording:
function startRecordin(){
    IS_RECORDING = true;
    record();
}

//stopRecording:
function stopRecording(){
    console.log("Stop recording called");
    IS_RECORDING = false;
    if(MEDIA_RECORDER !== null)
    {   MEDIA_RECORDER.stop();
        var tapToSpeakimg = document.getElementById("tapToSpeak");
        tapToSpeakimg.src = "./static/search.jpg";
        document.getElementById("instructionText").innerHTML = "Recognizing";
    }    
}

//record:
function record(){
    navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
        
        //start recording:
        MEDIA_RECORDER = new MediaRecorder(stream);
        MEDIA_RECORDER.start();
        
        //save audio chunks:
        const audioChunks = [];
        MEDIA_RECORDER.addEventListener("dataavailable", event => {
            audioChunks.push(event.data);
        });
        
        //analisys:
        const audioContext      = new AudioContext();
        const audioStreamSource = audioContext.createMediaStreamSource(stream);

        //stop event:
        MEDIA_RECORDER.addEventListener('stop', () => {
            
            //stop all the tracks:
            
            console.log('STOP event listner called');
            stream.getTracks().forEach(track => track.stop());
            //  if(!anySoundDetected) return;
            
            //send to server:
            const audioBlob = new Blob(audioChunks, {'type': 'audio/wav'});
            doWhateverWithAudio(audioBlob);
            
            //start recording again:
            //record();

        });

    });
}

//doWhateverWithAudio:
function doWhateverWithAudio(audioBlob){

    //.... send to server, downlod, etc.
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
	.then((response) => response)
	.then((result) => {
		console.log('Success:', result);

        var tapToSpeakimg = document.getElementById("tapToSpeak");
        tapToSpeakimg.src = "./static/tapToSpeak.png";
        document.getElementById("instructionText").innerHTML = "Tap to speak";

        // const player = new Audio();
        // player.src = URL.createObjectURL(audioBlob);;
        // player.play();
        tapToSpeakimg.onclick = "startRecording()";
	})
	.catch((error) => {
		console.error('Error:', error);
	});
    
}