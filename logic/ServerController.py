import random
import CardCodec

from logic.ServerModel import ServerModel

from logic import Catalog
from logic.Effects import Status
import SoundEffect
from Animation import Animation
# TODO Separate out source
from logic.Story import Source


DRAW_PER_TURN = 2
START_HAND_REAL = 3
START_HAND = START_HAND_REAL - DRAW_PER_TURN
HAND_CAP = 6

MANA_GAIN_PER_TURN = 1
START_MANA = 1 - MANA_GAIN_PER_TURN
MANA_CAP = 10

# Input signifying user wants to pass
PASS = 10


class ServerController:
    def __init__(self, deck1, deck2, avatar1, avatar2):
        self.model = ServerModel(deck1, deck2, avatar1, avatar2)

    # Return True if a play/pass occurred (False if play couldn't be completed)
    def on_player_input(self, player, choice, version=None):
        if choice == 13: # Autowin, debug
            self.model.wins[0] = 5
            self.model.version_incr()
            return True

        if version is not None and version != self.model.version_no:
            return False

        if self.model.get_winner() is not None:
            return False

        if player != self.model.priority:
            return False

        # Mulligans are still being performed
        if False in self.model.mulligans_complete:
            return False

        if choice == PASS:
            if not self.can_pass(player):
                return False
            else:
                self.model.passes += 1
                self.model.amt_passes[player] += 1

                self.model.switch_priority()

                self.model.sound_effect = SoundEffect.Pass

                # If both player's have passed in sequence, end turn and start another
                if self.model.passes == 2:
                    self.model.passes = 0

                    self.do_takedown()

                    # Model must be incremented here, so that all sounds/animations from the upkeep are sent to user
                    self.model.version_incr()

                    self.do_upkeep()
                else:
                    self.model.version_incr()

                return True
        else:
            if self.attempt_play(player, choice):
                self.model.passes = 0
                self.model.last_player_who_played = player
                self.model.switch_priority()

                self.model.version_incr()

                return True
            else:
                return False

    # Return false if given card couldn't be played
    def attempt_play(self, player, card_num):
        if self.can_play(player, card_num):
            self.model.sound_effect = None

            self.play(player, card_num)
            return True
        else:
            print(f"Can't play the {card_num}th card")
            return False

    # Player puts the the nth card of their hand on the stack
    # Assumes that the card can be played
    def play(self, player, card_num):
        # Remove the card from hand, then play it
        card = self.model.hand[player].pop(card_num)

        self.model.mana[player] -= self.get_cost(card, player)

        # If on_play results in something, add that card instead of this one
        result = card.on_play(player, self.model)
        if result:
            card = result

        # If playing a card triggers another card in hand, do that
        for card_in_hand in self.model.hand[player]:
            card_in_hand.in_hand_on_play(player, self.model)

        self.model.story.add_act(card, owner=player, source=Source.HAND)

    # The given player is redrawing the cards specified by mulligans
    def do_mulligan(self, player, mulligans):
        # TODO Lock are necessary to do this right, since everywhere else only 1 player has control at a time, but not here
        self.model.version_incr()

        # With index within the dealt hand
        kept_cards = []
        thrown_cards = []
        for i in range(min(START_HAND_REAL, len(self.model.hand[player]))):
            card = self.model.hand[player].pop(0)
            if mulligans[i]:
                thrown_cards.append((card, i))
            else:
                kept_cards.append((card, i))

        # Add each of the kept cards back to the hand
        for (card, index_from) in kept_cards:
            index_to = len(self.model.hand[player])
            self.model.animations[player].append(
                Animation('Mulligan', 'Hand', card=CardCodec.encode_card(card), index=index_from, index2=index_to))
            self.model.hand[player].append(card)

        # Draw as many cards as were mulliganed
        self.model.draw(player, mulligans.count(True))

        # Add each thrown card back to the deck
        for (card, index_from) in thrown_cards:
            self.model.deck[player].append(card)

            # Animate the card moving from mulliganed back to deck
            self.model.animations[player].append(
                Animation('Mulligan', 'Deck', card=CardCodec.encode_card(card), index=index_from))

        # Shuffle the deck, don't remember what was shuffled
        self.model.shuffle(player, remember=False)

        self.model.mulligans_complete[player] = True

    """PHASES"""
    # Begin the game
    def start(self):
        self.do_setup()
        self.do_upkeep()

        # Replace the draw animations with deck to mulligan
        for player in (0, 1):
            self.model.animations[player] = []

            for i in range(min(START_HAND_REAL, len(self.model.deck[player]))):
                card = self.model.hand[player][i]
                anim = Animation('Deck', 'Mulligan', card=CardCodec.encode_card(card), index=i)
                self.model.animations[player].append(anim)

    # Perform the setup phase
    def do_setup(self):
        for player in (0, 1):
            self.model.draw(player, START_HAND)
            self.model.max_mana = [START_MANA, START_MANA]

    # Perform the upkeep phase
    def do_upkeep(self):
        new_vision_0 = self.model.vision[0] if Status.AWAKENED in self.model.status[0] else 0
        new_vision_1 = self.model.vision[1] if Status.AWAKENED in self.model.status[1] else 0
        self.model.vision = [new_vision_0, new_vision_1]

        self.model.amt_passes = [0, 0]
        self.model.amt_drawn = [0, 0]
        # self.model.sound_effect = None

        # Give priority to the last player who has played a card
        self.model.priority = self.model.last_player_who_played

        # Each player resets their mana, performs upkeep statuses, card effects
        # NOTE Drawing must be done after!
        for player in (0, 1):
            if self.model.max_mana[player] < MANA_CAP:
                # Become the lower of mana_cap and incrementing current max mana
                self.model.max_mana[player] = min(self.model.max_mana[player] + MANA_GAIN_PER_TURN, MANA_CAP)
            self.model.mana[player] = self.model.max_mana[player]

            self.do_upkeep_statuses(player)

            # Each card in hand has a chance to do an upkeep effect
            index = 0
            while index < len(self.model.hand[player]):
                card = self.model.hand[player][index]

                something_activated = card.on_upkeep(player, self.model, index)

                if something_activated:
                    self.model.animations[player].append(
                        Animation('Hand', 'Hand', card=CardCodec.encode_card(card), index=index, index2=index))

                index += 1

            if len(self.model.pile[player]) > 0:
                # NOTE Morning is now the only effect that triggers in the discard pile
                card = self.model.pile[player][-1]
                something_activated = card.morning(player, self.model, len(self.model.pile[player]) - 1)
                if something_activated:
                    self.model.animations[player].append(
                        Animation('Discard', 'Discard', CardCodec.encode_card(card), index=index, index2=index))

        # Drawing happens after morning has finished for both players
        for player in (0, 1):
            # Draw cards for turn
            self.model.draw(player, DRAW_PER_TURN)

            # Guarantees - Guarantees about state of the game
            self.model.mana[player] = max(self.model.mana[player], 0)

    # Perform the takedown phase
    def do_takedown(self):
        # Resolve the story
        self.model.score = [0, 0]
        wins = [0, 0]

        # Reset to a new Recap for this round's takedown
        self.model.recap.reset()

        self.model.story.run(self.model)

        # Add to wins here
        if self.model.score[0] > self.model.score[1]:
            wins[0] += 1
        elif self.model.score[1] > self.model.score[0]:
            wins[1] += 1
        else:
            pass
        # Adjust the scores to reflect the wins from this round
        self.model.wins[0] += wins[0]
        self.model.wins[1] += wins[1]

        # Remember the scores
        self.model.round_results[0].append(self.model.score[0])
        self.model.round_results[1].append(self.model.score[1])

        # Recap the results
        safe_totals = [0,0]
        self.model.recap.add_total(self.model.score, wins, safe_totals)

        # Remember how the round ended for user's recap (Must come after wins are determined)
        self.model.story.save_end_state(self.model)
        self.model.story.clear()

        # Reset the sound effect so that win/lose/tie doesn't play
        self.model.sound_effect = None

    """EXPOSED UTILITY METHODS"""
    def get_client_model(self, player):
        def player_can_play(card_num):
            return self.can_play(player, card_num)

        cards_playable = list(map(player_can_play,
                                  list(range(len(self.model.hand[player])))))
        costs = []
        for card in self.model.hand[player]:
            costs.append(self.get_cost(card, player))

        return self.model.get_client_model(player, cards_playable, costs=costs)

    """SUB-PHASES"""
    def do_upkeep_statuses(self, player):

        # TODO Not dry, could make this method and the one below the same
        # Clear statuses that are created by other statuses
        created_statuses = [Status.INSPIRED]
        def clear_created_statuses(stat):
            return stat not in created_statuses
        self.model.status[player] = list(filter(clear_created_statuses, self.model.status[player]))

        for stat in self.model.status[player]:

            # Inspire : Gain 1 temporary mana
            if stat is Status.INSPIRE:
                self.model.mana[player] += 1
                self.model.status[player].append(Status.INSPIRED)

        cleared_statuses = [Status.INSPIRE,
                            Status.UNLOCKED,
                            Status.AWAKENED]

        def clear_temp_statuses(stat):
            return stat not in cleared_statuses
        self.model.status[player] = list(filter(clear_temp_statuses, self.model.status[player]))

    """UTILITY CHECKS"""
    # Check if the given player can play the given card
    def can_play(self, player, card_num):
        # Choice isn't in the player's hand
        if card_num >= len(self.model.hand[player]):
            return False

        card = self.model.hand[player][card_num]

        # Player doesn't have enough mana
        if self.get_cost(card, player) > self.model.mana[player]:
            return False

        return True

    # Check if the given player can pass in this state
    def can_pass(self, player):
        # If max mana (10) has been hit, and player has playable cards, they cannot dry pass
        if self.model.max_mana[player] == MANA_CAP and len(self.model.story.acts) == 0:
            for i in range(len(self.model.hand[player])):
                if self.can_play(player, i):
                    return False

        return True

    # Get the cost of a card in current state
    def get_cost(self, card, player):
        if Status.UNLOCKED in self.model.status[player]:
            return 0
        else:
            return card.get_cost(player, self.model)
