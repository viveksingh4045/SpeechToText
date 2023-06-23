from datetime import datetime
import os
import azure.cognitiveservices.speech as speechsdk
import openai
import requests

def main():
    try:
        speech_config = speechsdk.SpeechConfig(subscription='f6bd782f22b8465cb9173cc38d9b2ee4', region='centralindia')
        speech_config.speech_recognition_language="en-US"
        speech_config.speech_synthesis_voice_name = "en-GB-RyanNeural"
        speech_synthesizer = speechsdk.SpeechSynthesizer(speech_config)
        openai.api_key = "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"
        welcomeText = '''Welcome to conversational AI demo. Powered by Azure cognitive service and Open AI '''
        
        speech_synthesizer.speak_text_async(welcomeText).get()
        i = 5
        while i >0:
            command = TranscribeCommand(speech_config)

            if command.lower() == 'what time is it?':
                TellTime(speech_synthesizer)
            
            elif command.lower() == "what is the temperature?":
                TellTemp(speech_synthesizer)
            
            elif command.lower() == "what is your name?":
                noname = "I don't have a name am still under development but you can call me anything that you like"
                speech_synthesizer.speak_text_async(noname).get()
                print(f"AI :> {noname}")

            elif "can i call you" in command.lower():
                name = command.split(" ")[-1]
                response = f"Yes you can call me {name}"
                speech_synthesizer.speak_text_async(response).get()
                print(f"AI :> {response}")
            
            else:
                #print('Inside Else command')
                response = openai.Completion.create(engine="text-davinci-002", prompt=command, max_tokens=200)
                response = response.choices[0].text
                speech_synthesizer.speak_text_async(response).get()
                print(f"AI :> {response}")
            i -= 1

    except Exception as ex:
        print(ex)

def TranscribeCommand(speech_config):
    command = ''

    # Configure speech recognition
    audio_config = speechsdk.audio.AudioConfig(use_default_microphone=False, filename="Query.wav")
    speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

    print("Speak into your microphone.")
    speech_recognition_result = speech_recognizer.recognize_once_async().get()

    # Configure speech service
    # Get spoken input
    print("Recognized: {}".format(speech_recognition_result.text))

    return speech_recognition_result.text


def TellTime(speech_synthesizer):
    now = datetime.now()
    response_text = 'The time is {}:{:02d}'.format(now.hour,now.minute)
    # Configure speech synthesis en-IN-PrabhatNeural en-GB-RyanNeural
   
    # Synthesize spoken output
    speak = speech_synthesizer.speak_text_async(response_text).get()

    if speak.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        print(speak.reason)

    # Print the response
    print(f"AI :> {response_text}")

def TellTemp(speech_synthesizer):

    temp = "It's 12 degree celcius today. Sun was shining bright in Delhi"
    speak = speech_synthesizer.speak_text_async(temp).get()

    if speak.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        print(speak.reason)

    print(f"AI :> {temp}")

if __name__ == "__main__":
    main()