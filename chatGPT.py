import openai
openai.api_key = "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"

prompt = (f"User: Hi, How are you?\n"
          f"Chatbot: I'm fine, thank you. How can I help you today?")

def generate_prompt(animal):
    return """Suggest three names for an animal.


Animal: {}
Names:""".format(
        animal.capitalize()
    )

cow = 'How to prepare for an interview'
print(cow)
response = openai.Completion.create(engine="text-davinci-002", prompt=cow, max_tokens=100)


print(response.choices[0].text)