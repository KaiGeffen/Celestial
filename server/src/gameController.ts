import GameModel from '../../shared/state/gameModel'
import Card from '../../shared/state/card'

import { Status } from '../../shared/state/status'
import { SoundEffect } from '../../shared/state/soundEffect'
import { Animation } from '../../shared/animation'
import { Zone } from '../../shared/state/zone'
import { MechanicsSettings, Mulligan } from '../../shared/settings'

class ServerController {
  model: GameModel

  constructor(
    deck1: Card[],
    deck2: Card[],
    avatar1: number,
    avatar2: number,
    shuffle: boolean = true,
  ) {
    this.model = new GameModel(deck1, deck2, avatar1, avatar2, shuffle)
  }

  start(): void {
    this.doSetup()

    for (const player of [0, 1]) {
      this.model.animations[player] = []

      for (
        let i = 0;
        i <
        Math.min(MechanicsSettings.START_HAND, this.model.deck[player].length);
        i++
      ) {
        const card = this.model.hand[player][i]
        this.model.animations[player].push(
          new Animation({
            from: Zone.Deck,
            to: Zone.Mulligan,
            card: card,
            index: i,
          }),
        )
      }
    }
  }

  doSetup(): void {
    for (const player of [0, 1]) {
      this.model.draw(player, MechanicsSettings.START_HAND, true)
    }
  }

  onPlayerInput(player: number, choice: number, versionNum: number): boolean {
    // Game is over
    if (this.model.winner !== null) {
      return false
    }

    // Version number is wrong
    if (versionNum !== this.model.versionNo) {
      return false
    }

    // Player doesn't have priority
    if (player !== this.model.priority) {
      return false
    }

    // Still in mulligan phase
    if (this.model.mulligansComplete.includes(false)) {
      return false
    }

    if (choice === MechanicsSettings.PASS) {
      if (!this.canPass(player)) {
        return false
      } else {
        this.model.passes += 1
        this.model.amtPasses[player] += 1
        this.model.switchPriority()
        this.model.sound = SoundEffect.Pass

        if (this.model.passes === 2) {
          this.doResolvePhase()
          this.doUpkeep()
        } else {
          this.model.versionIncr()
        }

        return true
      }
    } else {
      if (this.attemptPlay(player, choice)) {
        this.model.passes = 0
        this.model.lastPlayerWhoPlayed = player
        this.model.switchPriority()
        this.model.versionIncr()
        return true
      } else {
        return false
      }
    }
  }

  attemptPlay(player: number, cardNum: number): boolean {
    if (this.canPlay(player, cardNum)) {
      this.model.sound = null
      this.play(player, cardNum)
      return true
    } else {
      return false
    }
  }

  play(player: number, cardNum: number): void {
    // Get the cost first, since some cards change their cost when a card leaves hand
    const cost = this.model.getCost(this.model.hand[player][cardNum], player)
    this.model.breath[player] -= cost

    const card = this.model.hand[player].splice(cardNum, 1)[0]

    // Trigger on-play effects
    card.onPlay(player, this.model)

    // Add the card to the story
    this.model.story.addAct(card, player)
  }

  doMulligan(player: number, mulligans: Mulligan): void {
    this.model.versionIncr()

    // Determine which cards are being kept or thrown back
    const keptCards: [Card, number][] = []
    const thrownCards: [Card, number][] = []
    const handSize = this.model.hand[player].length
    for (let i = 0; i < handSize; i++) {
      const card = this.model.hand[player].shift()
      if (mulligans[i]) {
        thrownCards.push([card, i])
      } else {
        keptCards.push([card, i])
      }
    }

    // Add the kept cards to the hand
    for (const [card, indexFrom] of keptCards) {
      const indexTo = this.model.hand[player].length
      this.model.animations[player].push(
        new Animation({
          from: Zone.Mulligan,
          to: Zone.Hand,
          card: card,
          index: indexFrom,
          index2: indexTo,
        }),
      )
      this.model.hand[player].push(card)

      // Trigger on-draw effects
      card.onDraw(player, this.model)
    }

    this.model.draw(player, mulligans.filter(Boolean).length)

    for (const [card, indexFrom] of thrownCards) {
      this.model.deck[player].push(card)
      this.model.animations[player].push(
        new Animation({
          from: Zone.Mulligan,
          to: Zone.Deck,
          card: card,
          index: indexFrom,
        }),
      )
    }

    this.model.shuffle(player, false)
    this.model.mulligansComplete[player] = true
  }

  doUpkeep(): void {
    // Reset vision
    const newVision0 = this.model.status[0].includes(Status.AWAKENED)
      ? this.model.vision[0]
      : 0
    const newVision1 = this.model.status[1].includes(Status.AWAKENED)
      ? this.model.vision[1]
      : 0
    this.model.vision = [newVision0, newVision1]

    // Reset round counters
    this.model.passes = 0
    this.model.amtPasses = [0, 0]
    this.model.amtDrawn = [0, 0]

    // Set priority
    this.model.priority = this.model.lastPlayerWhoPlayed

    // Increase max breath by 1, up to a cap
    const players = this.model.priority === 1 ? [1, 0] : [0, 1]
    for (const player of players) {
      if (this.model.maxBreath[player] < MechanicsSettings.BREATH_CAP) {
        this.model.maxBreath[player] = Math.min(
          this.model.maxBreath[player] + MechanicsSettings.BREATH_GAIN_PER_TURN,
          MechanicsSettings.BREATH_CAP,
        )
      }
      this.model.breath[player] = this.model.maxBreath[player]

      // Do any upkeep status effect
      this.doUpkeepStatuses(player)

      // Do any effects that activate in hand
      let index = 0
      while (index < this.model.hand[player].length) {
        const card = this.model.hand[player][index]
        const somethingActivated = card.onUpkeepInHand(
          player,
          this.model,
          index,
        )

        if (somethingActivated) {
          this.model.animations[player].push(
            new Animation({
              from: Zone.Hand,
              to: Zone.Hand,
              card: card,
              index: index,
              index2: index,
            }),
          )
        }

        index += 1
      }

      // Do any activated in discard pile effects
      if (this.model.pile[player].length > 0) {
        const card = this.model.pile[player][this.model.pile[player].length - 1]
        const somethingActivated = card.onMorning(
          player,
          this.model,
          this.model.pile[player].length - 1,
        )
        if (somethingActivated) {
          this.model.animations[player].push(
            new Animation({
              from: Zone.Discard,
              to: Zone.Discard,
              card: card,
              index: index,
              index2: index,
            }),
          )
        }
      }
    }

    // Draw cards for the turn, set breath to max
    for (const player of [0, 1]) {
      this.model.draw(player, MechanicsSettings.DRAW_PER_TURN)
      this.model.breath[player] = Math.max(this.model.breath[player], 0)
    }
  }

  // The resolution phase, after both players have passed. Points and effects happen as cards resolve
  doResolvePhase(): void {
    this.model.score = [0, 0]
    const wins: [number, number] = [0, 0]

    // this.model.recap.reset()
    this.model.story.run(this.model)

    // If a player has more points, they win the round
    if (this.model.score[0] > this.model.score[1]) {
      wins[0] += 1
    } else if (this.model.score[1] > this.model.score[0]) {
      wins[1] += 1
    }

    this.model.wins[0] += wins[0]
    this.model.wins[1] += wins[1]
    // Declare a game winner if a player has 5 wins
    ;[0, 1].forEach((player) => {
      if (this.model.wins[player] >= 5) {
        this.model.winner = player
      }
    })

    // Add each players points as the final moment after the story resolves
    this.model.roundResults[0].push(this.model.score[0])
    this.model.roundResults[1].push(this.model.score[1])

    this.model.roundCount += 1

    this.model.story.saveFinalStateAndClear(this.model)

    this.model.sound = null
  }

  doUpkeepStatuses(player: number): void {
    // Clear inspired from last round
    const createdStatuses = [Status.INSPIRED]
    this.model.status[player] = this.model.status[player].filter(
      (stat) => !createdStatuses.includes(stat),
    )

    // Add inspired equal to the amount of inspire
    for (const stat of this.model.status[player]) {
      if (stat === Status.INSPIRE) {
        this.model.breath[player] += 1
        this.model.status[player].push(Status.INSPIRED)
      }
    }

    // Clear all statuses besides those just added
    const clearedStatuses = [Status.INSPIRE, Status.UNLOCKED, Status.AWAKENED]
    this.model.status[player] = this.model.status[player].filter(
      (stat) => !clearedStatuses.includes(stat),
    )
  }

  canPlay(player: number, cardNum: number): boolean {
    if (cardNum >= this.model.hand[player].length) {
      return false
    }

    const card = this.model.hand[player][cardNum]
    if (this.model.getCost(card, player) > this.model.breath[player]) {
      return false
    }

    return true
  }

  canPass(player: number): boolean {
    return true
    // if (
    //   this.model.maxBreath[player] === BREATH_CAP &&
    //   this.model.story.acts.length === 0
    // ) {
    //   for (let i = 0; i < this.model.hand[player].length; i++) {
    //     if (this.canPlay(player, i)) {
    //       return false
    //     }
    //   }
    // }

    // return true
  }
}

export { ServerController }
