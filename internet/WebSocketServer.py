import asyncio
import json
import logging
import websockets

import CardCodec
from logic.ServerController import ServerController

logging.basicConfig()

STATE = {"value": 0}

USERS = []

game = None


def state_event(player):
    return json.dumps({"type": "transmit_state", "value": game.get_client_model(player)})


def users_event():
    return json.dumps({"type": "both_players_connected", "value": len(USERS) == 2})


async def notify_state():
    if USERS:  # asyncio.wait doesn't accept an empty list
        await asyncio.wait([USERS[i].send(state_event(i)) for i in range(len(USERS))])


async def notify_users():
    if USERS:  # asyncio.wait doesn't accept an empty list
        message = users_event()
        await asyncio.wait([user.send(message) for user in USERS])


async def register(websocket):
    USERS.append(websocket)
    await notify_users()


async def unregister(websocket):
    USERS.remove(websocket)
    await notify_users()


deck1 = None
async def main(websocket, path):
    global game
    global deck1

    # Which player I am
    player = None

    # register(websocket) sends user_event() to websocket
    await register(websocket)
    try:
        async for message in websocket:
            print(message)
            data = json.loads(message)

            if data["type"] == "init":
                deck = CardCodec.decode_deck(data["value"])
                print(deck)

                if deck1 is None:
                    deck1 = deck
                    player = 0

                else:
                    player = 1

                    # TODO locks
                    game = ServerController(deck1, deck)
                    game.start()

                    # So that reconnects don't reuse the previous deck
                    deck1 = None

                    await notify_state()
            elif data["type"] == "mulligan":
                # TODO implement for real
                mulligan = CardCodec.decode_mulligans(data["value"])
                game.do_mulligan(player, mulligan)
            elif data["type"] == "play_card":
                if game.on_player_input(player, data["value"]):
                    print("Yeah that worked gonna play now")
                    await notify_state()

            # data = json.loads(message)
            # if data["action"] == "minus":
            #     STATE["value"] -= 1
            #     await notify_state()
            # elif data["action"] == "plus":
            #     STATE["value"] += 1
            #     await notify_state()
            # else:
            #     logging.error("unsupported event: {}", data)
    finally:
        await unregister(websocket)


start_server = websockets.serve(main, "localhost", 6789)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()