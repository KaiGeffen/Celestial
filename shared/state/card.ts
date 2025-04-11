import { Status } from './status'
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

    result += game.status[player].filter(
      (status: Status) => status === Status.NOURISH,
    ).length
    game.status[player] = game.status[player].filter(
      (status: Status) => status !== Status.NOURISH,
    )
    result -= game.status[player].filter(
      (status: Status) => status === Status.STARVE,
    ).length
    game.status[player] = game.status[player].filter(
      (status: Status) => status !== Status.STARVE,
    )

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
    for (const card of game.hand[player]) {
      if (card.name === 'Child') {
        card.points += amt
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
    for (let i = 0; i < amt; i++) {
      game.status[player].push(Status.INSPIRED)
    }
  }

  addStatus(amt: number, game: GameModel, player: number, stat: Status) {
    for (let i = 0; i < amt; i++) {
      if (stat === Status.NOURISH) {
        const starveIndex = game.status[player].indexOf(Status.STARVE)
        if (starveIndex !== -1) {
          // Remove just one STARVE status
          game.status[player].splice(starveIndex, 1)
        } else {
          game.status[player].push(stat)
        }
      } else if (stat === Status.STARVE) {
        const nourishIndex = game.status[player].indexOf(Status.NOURISH)
        if (nourishIndex !== -1) {
          // Remove just one NOURISH status
          game.status[player].splice(nourishIndex, 1)
        } else {
          game.status[player].push(stat)
        }
      } else {
        game.status[player].push(stat)
      }
    }
  }

  inspire(amt: number, game: GameModel, player: number) {
    game.animations[player].push(
      new Animation({
        from: Zone.Status,
        status: 0,
      }),
    )
    this.addStatus(amt, game, player, Status.INSPIRE)
  }

  nourish(amt: number, game: GameModel, player: number) {
    game.animations[player].push(
      new Animation({
        from: Zone.Status,
        status: 2,
      }),
    )
    this.addStatus(amt, game, player, Status.NOURISH)
  }

  starve(amt: number, game: GameModel, player: number) {
    game.animations[player].push(
      new Animation({
        from: Zone.Status,
        // TODO Don't hardcode this number here
        status: 3,
      }),
    )
    this.addStatus(amt, game, player, Status.STARVE)
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
    let theirBreath =
      world.maxBreath[1] +
      world.status[1].filter((status: Status) => status === Status.INSPIRED)
        .length

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
    game.vision[player] += this.amt
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
