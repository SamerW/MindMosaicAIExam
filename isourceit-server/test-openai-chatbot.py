import json
from argparse import ArgumentParser
from json import JSONDecodeError
from typing import Optional, List, Dict, TypedDict, Iterable, Tuple, Union
import requests
import sseclient

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
NAME_MODEL_DICT = {
    'gpt-3.5-turbo': 'Most capable GPT-3.5 model.',
    'gpt-4': 'GPT 4'
}
OPENAI_SYSTEM_INIT_PROMPT = "You are a helpful assistant."
OPENAI_TEMPERATURE = 0.6


class ChatInteraction(TypedDict):
    role: str
    content: str


class ChatFragment(TypedDict):
    content: str


def handle_prompt(prompt: str, username: str, private_key: str,
                  previous_interactions: List[ChatInteraction],
                  init_system_prompt: Optional[str],
                  model_id: str, open_ai_temperature: int) -> Iterable[Tuple[str, Union[ChatFragment, ChatInteraction]]]:
    model = NAME_MODEL_DICT.get(model_id)
    if not model:
        raise Exception('Unknown model')

    rq_messages = []
    if init_system_prompt:
        rq_messages.append(ChatInteraction(role='system', content=init_system_prompt))
    if previous_interactions:
        rq_messages.extend(previous_interactions)
    rq_messages.append(ChatInteraction(role='user', content=prompt))

    rq_body = {
        'model': model_id,
        'messages': rq_messages,
        'temperature': open_ai_temperature,
        'stream': True,
        'user': username
    }

    rq_headers = {"Authorization": "Bearer {}".format(private_key),
                  "Content-Type": "application/json"}

    try:
        http_response = requests.post(OPENAI_CHAT_URL, data=json.dumps(rq_body), headers=rq_headers, stream=True)
        http_response.raise_for_status()
    except requests.exceptions.Timeout as e:
        print('>INFO: timeout exception: {}'.format(repr(e)))
        raise e
    except requests.exceptions.ConnectionError as e:
        print('>INFO: Connection exception: {}'.format(repr(e)))
        raise e
    except requests.exceptions.HTTPError as e:
        print('>INFO: HTTPError: {}'.format(repr(e)))
        raise e
    except requests.exceptions.RequestException as e:
        print('>INFO: Other request error: {}'.format(repr(e)))
        raise e
    else:
        complete_content = []
        client = sseclient.SSEClient(http_response)
        for event in client.events():
            if event.data == '[DONE]':
                # end marker received. stop here
                break
            # parse json data
            try:
                ev_data = json.loads(event.data)
            except JSONDecodeError as e:
                print(">INFO: Got json decode error: {}".format(repr(e)))
                break
            else:
                # process finish_reason (for logging)
                finish_reason = ev_data['choices'][0]["finish_reason"]
                if finish_reason == 'content_filter':
                    print(">INFO: Got OpenAI answer with content_filter marker: Omitted content due to a flag from "
                          "OpenAI content filters. User {}".format(username))
                elif finish_reason == 'length':
                    print(">INFO: Got OpenAI answer with length marker: Incomplete model output due to max_tokens "
                          "parameter or token limit. User {}".format(username))
                # process answer delta
                delta = ev_data['choices'][0]['delta']
                # if role received, check it for logging and do nothing else
                if 'role' in delta:
                    if delta['role'] != 'assistant':
                        print(">INFO: Got OpenAI answer with bad role: {}".format(delta['role']))
                    continue
                # if content received, set it as the answer of the result and send the result to the queue
                if 'content' in delta:
                    complete_content.append(delta['content'])
                    # prepare a response
                    yield 'fragment', ChatFragment(content=delta['content'])
        yield 'interaction', ChatInteraction(content=''.join(complete_content), role='assistant')


def handle_interaction(username: str, private_key: str, first_prompt: Optional[str],
                       init_system_prompt: Optional[str], model_id: str, open_ai_temperature: int):
    previous_interactions: List[ChatInteraction] = []
    current_prompt: str = first_prompt

    print(">INFO: start interaction with system prompt \"%s\"" % (init_system_prompt if init_system_prompt else '<None>'))
    if current_prompt:
        print(">INFO: First prompt: \"%s\"" % current_prompt)

    while True:
        if not current_prompt:
            current_prompt = input('PROMPT (enter to leave): ')
            if not current_prompt:
                break

        interaction_received = False
        for res_type, result in handle_prompt(current_prompt, username, private_key, previous_interactions,
                                              init_system_prompt, model_id, open_ai_temperature):
            if interaction_received:
                print(">INFO: received result of type %s while interaction received" % str(res_type))
            if res_type == 'fragment':
                print(result['content'], end='')
            elif res_type == 'interaction':
                previous_interactions.append(result)
                interaction_received = True
            else:
                print(">INFO: unmanaged result type: " + res_type)
        print()
        current_prompt = None


def setup_argument_parser() -> ArgumentParser:
    parser = ArgumentParser(description="Chat with OpenAI ChatGPT Bot")

    parser.add_argument('-k', '--key', help='API key', type=str, required=True)
    parser.add_argument('-u', '--user', help='Username to use', type=str, default='theStudent')
    parser.add_argument('-p', '--prompt', help='First prompt to send', type=str, required=False)
    parser.add_argument('-ns', '--no-system-prompt', help='Disabled system prompt', action='store_true')
    parser.add_argument('-s', '--system-prompt', help='System prompt', type=str, required=False)
    parser.add_argument('-m', '--model', help='AI Model', type=str, default='gpt-3.5-turbo',
                        choices=NAME_MODEL_DICT.keys())
    parser.add_argument('-t', '--temperature', help='temperature', type=float, default=OPENAI_TEMPERATURE)
    return parser


def main(args):
    first_prompt = args.prompt if args.prompt else None

    system_prompt = OPENAI_SYSTEM_INIT_PROMPT
    if args.no_system_prompt:
        system_prompt = None
    elif args.system_prompt:
        system_prompt = args.system_prompt

    handle_interaction(username=args.user, private_key=args.key, first_prompt=first_prompt,
                       init_system_prompt=system_prompt, model_id=args.model, open_ai_temperature=args.temperature)


if __name__ == '__main__':
    arg_parser = setup_argument_parser()
    args = arg_parser.parse_args()
    main(args)

"""
python test-openai-chatbot.py -k XXXX -u student -ns -p "You should act as cybersecurity professor who follows the socratic approach for teaching. I will give you a question and a final answer. You should propose a set of  questions that you can ask to students in an interactive way one by one to guide them to the final answer.  Please don't answer the questions on behalf of students, only adapt the questions based on the student answers. Give the questions in an interactive way one by one, and wait for the answer of the student before you move to the next question. Change the questions based on the answer of the students.  

The question is : 
Given the following scenario, which of the CIA security model aspects were compromised? 
Alice sent an encrypted message to Bob! Eve intercepted and prevented Bob from receving the message.
Final answer is:  availability"
"""