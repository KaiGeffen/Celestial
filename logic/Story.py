from enum import Enum

import SoundEffect
from logic.Recap import Recap
from logic.Effects import Quality


# TODO Remove source
# How an act was added to the story
# Played from hand, sprung from hand, etc
class Source(Enum):
    HAND = 0
    SPRING = 1
    PILE = 2


class Story:
    def __init__(self):
        self.acts = []
        self.recap = Recap()

    def add_act(self, card, owner, source=Source.HAND, i=None):
        act = Act(card, owner, source)
        if i is None:
            self.acts.append(act)
        else:
            self.acts.insert(i, act)

    def run(self, game, isSimplified=False):
        # Reset the recap so that it now recaps this run
        self.recap.reset()

        state_before_play = ['', '']
        for player in [0, 1]:
            state_before_play[player] = game.get_client_model(player=player, is_recap=True)
        self.recap.add_state(state_before_play)
        game.animations = [[], []]

        index = 0
        # List of callbacks that occur as the round ends
        round_end_effects = []
        while self.acts:
            act = self.acts.pop(0)

            game.sound_effect = SoundEffect.Resolve

            if act.countered:
                result = 'Countered'
            else:
                # Only for the tutorial
                if isSimplified:
                    game.score[act.owner] += act.card.points
                    result = 'SIMPLIFIED TODO'

                elif act.source is Source.HAND or act.source is Source.PILE:
                    result = act.card.play(player=act.owner,
                                           game=game,
                                           index=index,
                                           bonus=act.bonus)
                    round_end_effects.append((act.card.on_round_end, act.owner))

            # Card goes to pile unless it has fleeting
            if Quality.FLEETING not in act.card.qualities:
                game.pile[act.owner].append(act.card)
            else:
                game.expended[act.owner].append(act.card)

            index += 1

            self.recap.add(act.card, act.owner, result)

            # Save as a string what state the game is in after the card has been played
            state_after_play = ['', '']
            for player in [0, 1]:
                state_after_play[player] = game.get_client_model(player=player, is_recap=True)

            self.recap.add_state(state_after_play)
            game.animations = [[], []]

        # Do any round end effects
        for (callback, player) in round_end_effects:
            callback(player, game)

    def save_end_state(self, game):
        # Save an ending state which includes win/loss/tie sfx
        state_after_play = ['', '']
        for player in [0, 1]:
            # Win/Lose based on which player the state is for
            if self.recap.wins[player] > 0:
                game.sound_effect = SoundEffect.Win
            elif self.recap.wins[player ^ 1] > 0:
                game.sound_effect = SoundEffect.Lose
            else:
                game.sound_effect = SoundEffect.Tie

            state_after_play[player] = game.get_client_model(player=player, is_recap=True)
        self.recap.add_state(state_after_play)
        game.animations = [[], []]

    def clear(self):
        self.acts = []

    def get_length(self):
        return len(self.acts)

    def is_empty(self):
        return len(self.acts) == 0

    def counter(self, function):
        for act in self.acts:
            if function(act):
                act.countered = True

                return act.card

        return None
        # if self.get_length() > index:
        #     self.acts[index].countered = True
        #
        #     return self.acts[index].card
        # else:
        #     return None

    # TODO This has a bug if origin is before destination, since the indexing changes in that case
    def move_act(self, index_origin, index_dest):
        act = self.acts.pop(index_origin)
        self.acts.insert(index_dest, act)

        return act

    # Remeove and return the act at index
    def remove_act(self, index):
        if len(self.acts) < index + 1:
            raise Exception(f"Tried to remove act {index} in a story with only {len(self.acts)} acts.")

        return self.acts.pop(index)

    # Replace the act at index with replacement_act
    def replace_act(self, index, replacement_act):
        if len(self.acts) < index + 1:
            raise Exception(f"Tried to replace act {index} in a story with only {len(self.acts)} acts.")

        self.acts[index] = replacement_act


class Act:
    def __init__(self, card, owner, source=Source.HAND):
        self.card = card
        self.owner = owner
        self.source = source

        self.countered = False
        self.bonus = 0
