import os
import openai
from flask import Flask, redirect, render_template, request, url_for, Response, stream_with_context
import os
import azure.cognitiveservices.speech as speechsdk
import openai
import unicodedata

app = Flask(__name__)
openai.api_key = os.getenv("OPENAI_API_KEY")


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        animal = request.form["animal"]
        response = openai.Completion.create(
            model="text-davinci-003",
            prompt=animal,
            max_tokens=200,
        )
        
        resp = response.choices[0].text
        resp = resp.split('\n')
        data = [i for i in resp if len(i)>0]
        print(f"AI :> {response.choices[0]}")
        
        return render_template("index.html", result=data)

    result = request.args.get("result")
    return render_template("index.html", result=result)

@app.route("/save", methods=["POST"])
def TranscribeCommand():
    speech_config = speechsdk.SpeechConfig(subscription= os.getenv('SUBSCRIPTION'), region=os.getenv('REGION'))
    speech_config.speech_recognition_language="en-US"
    speech_config.speech_synthesis_voice_name = "en-GB-RyanNeural"
    speech_synthesizer = speechsdk.SpeechSynthesizer(speech_config, audio_config=None)
    print(f"Request Received{request.endpoint}")
    if "file" not in request.files:
        return {"Error": "No file received"}

    file = request.files["file"]
    print(file.filename)
    if file.filename == "":
        return {"Error": "No file received"}

    if file:
        #recognizer = sr.Recognizer()
        #audioFile = sr.AudioFile(file)
        #f = file.filename
        f = os.path.join(os.path.dirname( __file__ ), 'audioin',file.filename)
        file.save(f)
        audio_config = speechsdk.audio.AudioConfig(use_default_microphone=False,filename = f)
        speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
        speech_recognition_result = speech_recognizer.recognize_once()

        if speech_recognition_result.reason == speechsdk.ResultReason.RecognizedSpeech:
            print("Recognized: {}".format(speech_recognition_result.text))
        elif speech_recognition_result.reason == speechsdk.ResultReason.NoMatch:
            print("No speech could be recognized: {}".format(speech_recognition_result.no_match_details))
            return {"Error": speech_recognition_result.no_match_details}
        elif speech_recognition_result.reason == speechsdk.ResultReason.Canceled:
            cancellation_details = speech_recognition_result.cancellation_details
            print("Speech Recognition canceled: {}".format(cancellation_details.reason))
            if cancellation_details.reason == speechsdk.CancellationReason.Error:
                print("Error details: {}".format(cancellation_details.error_details))
                return {"Error":cancellation_details.error_details}

        openai.api_key = os.getenv('OPENAI_API_KEY')
        if len(speech_recognition_result.text) > 0:
            response = openai.Completion.create(engine="text-davinci-003", prompt=speech_recognition_result.text, max_tokens=200)
            print("Open AI response: {}".format(response.choices[0].text))
            audioResponse = speech_synthesizer.speak_text_async(response.choices[0].text).get()
            #stream = speechsdk.AudioDataStream(audioResponse)
            openAItxt = response.choices[0].text
            openAItxt_flat = " ".join(openAItxt.split('\n'))
            #audio = stream_with_context(stream)
            #print(stream)
            resp = Response(response= audioResponse.audio_data, mimetype="audio/wav")
            resp.headers["query"] = speech_recognition_result.text
            resp.headers["result"] = unicodedata.normalize('NFKD', openAItxt_flat).encode('latin-1', 'ignore')
            return resp

        return {"Error": "Some unexpected error occured"}


@app.after_request
def delete_audio(response):
    print("After request called")
    if request.endpoint=="TranscribeCommand": 
        fileName = request.files["file"].filename
        file = os.path.join(os.path.dirname( __file__ ), 'audioin',fileName)
        #os.remove(f"./audioin/{fileName}")
        os.remove(file)
    return response



