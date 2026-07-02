import Card from '../card'
import { Quality } from '../quality'
import GameModel from '../gameModel'
import { Zone } from '../zone'
import { Animation } from '../../animation'
import { wound } from './tokens'

class Agony extends Card {
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
  beta: true,
})

class Ecstasy extends Card {
  play(player: number, game: GameModel, index: number, bonus: number) {
    super.play(player, game, index, bonus)
    game.score[player] *= 2
  }
}
const ecstasy = new Ecstasy({
  name: 'Ecstasy',
  id: 1102,
  cost: 2,
  points: 1,
  text: "Becomes Agony\nDouble each player's points.",
  theme: 3,
  beta: true,
})

export { agony, ecstasy }
