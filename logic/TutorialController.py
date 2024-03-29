from logic.ServerController import ServerController
from logic.ServerModel import ServerModel
from logic.Catalog import *

# TODO Redo


class TutorialController(ServerController):
    def __init__(self, num=None):

        p_decks = [
            [dove, dove, dove, dove, dove, mercy, dash,
             mercy, dove, dash, dove, dash, dove, dove],
            [uprising, dove, mercy, dash, stars, stars, dove,
             stars, stars, uprising, stars, mercy, dove, stars],
            [uprising, dove, dove, fruit, dash, dove, dove,
             stars, cosmos, fruit, uprising, dove, stars, fruit, dove]
        ]
        o_decks = [
            [dove, dove, dove, dove, dove, dove, dove, dove,
             dove, dove, dove, dove, dove, dove, dove],
            [dove, dove, dove, dove, dove, dove, dove, dove,
             dove, dove, dove, dove, dove, dove, dove],
            [dove, dove, dove, dove, dove, dove, dove, dove,
             dash, dash, dash, dove, dash, dash, stars]
        ]

        # NOTE The last cards are the top of the deck, which isn't shuffled for tutorial
        player_deck = [mercy, mercy, dove, dash, mercy, dove, dove, dash,
                       dove, dove, dash, dove, dash, dove, dove]
        ai_deck = [dove, mercy, dove, dove, mercy, dove, dove, dove,
                   mercy, dove, dove, dove, dove, dove, dove]

        if num is not None:
            player_deck = p_decks[num]
            ai_deck = o_decks[num]
        self.model = ServerModel(player_deck, ai_deck, 0, 0, shuffle=False)

        if num is not None:
            self.model.wins[0] = 2

    # Ensure that player has priority
    def start(self):
        super().start()
        self.model.priority = 0

    # Overwrite the mulligan in order to not shuffle the deck
    def do_mulligan(self, player, mulligans):
        self.model.mulligans_complete[player] = True

    # Ensure that human starts each round with priority
    def do_upkeep(self):
        super().do_upkeep()
        self.model.priority = 0

    # TODO Don't copy so much, call something
    # Perform the takedown phase
    def do_takedown(self):
        # After 2 wins, player no longer plays simplified version
        if self.model.wins[0] >= 2:
            super().do_takedown()
            return

        # Resolve the story
        self.model.score = [0, 0]
        wins = [0, 0]

        # Reset to a new Recap for this round's takedown
        self.model.recap.reset()

        self.model.story.run(self.model, isSimplified=True)

        # Add to wins here
        if self.model.score[0] > self.model.score[1]:
            if self.model.score[0] > 0:
                wins[0] += 1
        elif self.model.score[1] > self.model.score[0]:
            if self.model.score[1] > 0:
                wins[1] += 1
        else:
            pass
        # Adjust the scores to reflect the wins from this round
        self.model.wins[0] += wins[0]
        self.model.wins[1] += wins[1]

        # Recap the results
        self.model.recap.add_total(self.model.score, wins, [0,0])

        # Remember how the round ended for user's recap (Must come after wins are determined)
        self.model.story.save_end_state(self.model)
        self.model.story.clear()
