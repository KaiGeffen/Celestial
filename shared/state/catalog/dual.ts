import Card, { CardData } from '../card'
import { Quality } from '../quality'
import GameModel from '../gameModel'
import { Zone } from '../zone'
import { Animation, Visibility } from '../../animation'
import { wound } from './tokens'

// A card that switches back and forth when you pass while it's in hand
abstract class DualCard extends Card {
  abstract get otherCard(): Card

  onPassInHand(game: GameModel, owner: 0 | 1, index: number): void {
    super.onPassInHand(game, owner, index)

    const other = this.otherCard
    if (other) {
      game.hand[owner][index] = other

      // Animation
      game.animations[owner].push(
        new Animation({
          from: Zone.Transform,
          to: Zone.Hand,
          card: this,
          index2: index,
          visibility: Visibility.FullyUnknown,
        }),
      )
    }
  }
}

class Agony extends DualCard {
  get otherCard() {
    return ecstasy
  }

  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    game.create(Zone.Hand, player ^ 1, wound)
  }
}
const agony = new Agony({
  name: 'Agony',
  id: 1101,
  cost: 1,
  text: "Becomes Ecstasy\nCreate a Wound in your opponent's hand.",
  theme: 2,
})

class Ecstasy extends DualCard {
  get otherCard() {
    return agony
  }

  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)

    // Double each player's points
    ;[0, 1].forEach((p) => {
      game.score[p] *= 2
    })
  }
}
const ecstasy = new Ecstasy({
  name: 'Ecstasy',
  id: 1102,
  cost: 2,
  points: 1,
  text: "Becomes Agony\nDouble each player's points.",
  theme: 3,
})

class Subject extends DualCard {
  get otherCard() {
    return witness
  }
}
const subject = new Subject({
  name: 'Subject',
  id: 1103,
  cost: 2,
  points: 2,
  text: 'Becomes Witness',
  theme: 4,
})

class Witness extends DualCard {
  get otherCard() {
    return subject
  }

  onPlay(player: number, game: GameModel): void {
    game.status[player].vision += 4
  }
}
const witness = new Witness({
  name: 'Witness',
  id: 1104,
  text: 'Becomes Witness\nWhen played, gain Sight 4.',
  theme: 5,
})

// Mark each card as beta and export
function markBeta(cards: Card[]): void {
  for (const card of cards) {
    card.beta = true
  }
}

markBeta([agony, ecstasy, subject, witness])
export { agony, ecstasy, subject, witness }
