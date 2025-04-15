import { Quality } from './quality'
import { Act } from './story'
import GameModel from './gameModel'
import { Animation } from '../animation'
import { Zone } from './zone'
import { Keyword } from './keyword'

interface CardData {
  name?: string
  id?: number
  cost?: number
  points?: number
  // Some cards include this, otherwise defaults to points
  basePoints?: number
  qualities?: Quality[]

  // Just used by client
  text?: string
  story?: string
  beta?: boolean
}

export default class Card {
  name: string
  id: number
  cost: number
  points: number
  basePoints: number
  qualities: Quality[]

  // Only used client-side
  text: string
  story: string = ''
  beta: boolean = false

  constructor({
    name = '',
    id = 0,
    cost = 0,
    points = 0,
    basePoints = points,
    qualities = [],

    text = '',
    story = '',
    beta = false,
  }: CardData) {
    this.name = name
    this.id = id
    this.cost = cost
    this.points = points
    this.basePoints = basePoints
    this.qualities = qualities

    this.text = text
    this.story = story
    this.beta = beta
  }

  /* Main functions */
  play(player: number, game: GameModel, index: number, bonus: number): void {
    let result = this.points + bonus

    result += game.status[player].nourish
    game.status[player].nourish = 0

    game.score[player] += result

    result > 0 ? `+${result}` : `${result}`
  }

  getCost(player: number, game: GameModel): number {
    return this.cost
  }

  isVisible(): boolean {
    return this.qualities.includes(Quality.VISIBLE)
  }

  /* Keywords */
  // Spend the given amount of breath, return whether successful
  exhale(amt: number, game: GameModel, player: number): boolean {
    if (game.breath[player] >= amt) {
      game.breath[player] -= amt
      return true
    } else {
      return false
    }
  }

  birth(amt: number, game: GameModel, player: number) {
    for (let i = 0; i < game.hand[player].length; i++) {
      const card = game.hand[player][i]
      if (card.name === 'Child') {
        // NOTE This replacement is done so that the replay doesn't show the eventual point value before it's achieved
        const newCard = new Card({
          name: 'Child',
          id: 1003,
          points: amt + card.points,
          basePoints: 0,
          text: 'Fleeting',
          qualities: [Quality.FLEETING],
        })
        game.hand[player][i] = newCard
        return
      }
    }

    // If no Child card, create one
    const card = new Card({
      name: 'Child',
      id: 1003,
      points: amt,
      basePoints: 0,
      text: 'Fleeting',
      qualities: [Quality.FLEETING],
    })
    game.create(player, card)
  }

  transform(index: number, card: Card, game: GameModel) {
    if (index + 1 <= game.story.acts.length) {
      const act = game.story.acts[index]
      const oldCard = act.card

      game.story.replaceAct(index, new Act(card, act.owner))

      game.animations[act.owner].push(
        new Animation({
          from: Zone.Transform,
          to: Zone.Story,
          card: oldCard,
          index2: index,
        }),
      )
    }
  }

  /* Triggers */
  onUpkeepInHand(player: number, game: GameModel, index: number): boolean {
    return false
  }

  onMorning(player: number, game: GameModel, index: number): boolean {
    return false
  }

  onPlay(player: number, game: GameModel): void {}

  onDiscard(player: number, game: GameModel, index: number): void {}

  onRoundEndIfThisResolved(player: number, game: GameModel): void {}

  onDraw(player: number, game: GameModel): void {}

  /* Common functions */
  reset(game: GameModel) {
    game.score = [0, 0]
  }

  addBreath(amt: number, game: GameModel, player: number) {
    game.breath[player] += amt
    // TODO Is this correct? Opponent shouldnt know about Ecology for example
    game.status[player].inspired += amt
  }

  inspire(amt: number, game: GameModel, player: number) {
    game.animations[player].push(
      new Animation({
        from: Zone.Status,
        status: 0,
      }),
    )
    game.status[player].inspire += amt
  }

  nourish(amt: number, game: GameModel, player: number) {
    game.animations[player].push(
      new Animation({
        from: Zone.Status,
        status: 2,
      }),
    )
    game.status[player].nourish += amt
  }

  starve(amt: number, game: GameModel, player: number) {
    game.animations[player].push(
      new Animation({
        from: Zone.Status,
        // TODO Don't hardcode this number here
        status: 3,
      }),
    )
    game.status[player].nourish -= amt
  }

  /* AI heuristics */
  ratePlay(world: any): number {
    return Math.max(1, this.cost)
  }

  rateDelay(world: any): number {
    return 0
  }

  rateReset(world: any): number {
    let knownValue = 0
    let theirUnknownCards = 0
    let theirBreath = world.maxBreath[1] + world.status[1].inspired

    for (const act of world.story.acts) {
      const card = act.card
      if (act.owner === 0) {
        knownValue -= card.cost
      } else if (card.qualities.includes(Quality.VISIBLE)) {
        knownValue += card.cost
        theirBreath -= card.cost
      } else {
        theirUnknownCards++
      }
    }

    let value = knownValue
    for (let i = 0; i < theirUnknownCards; i++) {
      const guessedValue = Math.floor(theirBreath / 2)
      value += guessedValue
      theirBreath -= guessedValue
    }

    return value
  }

  rateDiscard(world: any): number {
    // TODO Redo this, it uses hardcoded names
    let extraCards = 0
    for (const act of world.story.acts) {
      if (['Mercy'].includes(act.card.name)) {
        extraCards++
      } else if (['Dagger', 'Bone Knife', 'Chimney'].includes(act.card.name)) {
        extraCards--
      }
    }

    const cardsInHandToValue = [0, 0.6, 0.8, 1, 1, 0.2, 0.1]
    const handCount = Math.max(
      0,
      Math.min(6, world.hand[1].length + extraCards),
    )

    return cardsInHandToValue[handCount]
  }

  // TODO The below are just for client (Mobile focus menu)
  getHintText(): string {
    return ''
  }
}

export class SightCard extends Card {
  constructor(
    public amt: number,
    data: CardData,
  ) {
    super(data)
  }

  onPlay(player: number, game: GameModel): void {
    game.status[player].vision += this.amt
  }
}

export class RefreshCard extends Card {
  onPlay(player: number, game: GameModel): void {
    if (game.hand[player].length > 0) {
      const card = game.hand[player].shift()
      game.deck[player].unshift(card)
      game.draw(player, 1)
    }
  }
}
