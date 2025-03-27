import 'phaser'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import { CardImage } from '../../lib/cardImage'
import GameModel from '../../../../shared/state/gameModel'
import {
  Depth,
  Space,
  Style,
  Time,
  Flags,
  UserSettings,
  Color,
} from '../../settings/settings'
import BaseScene from '../baseScene'
import Region from './baseRegion'
import CardLocation from './cardLocation'
import { GameScene } from '../gameScene'
import { MechanicsSettings } from '../../../../shared/settings'

// The y distance card moves up when hovered
const HOVER_OFFSET = Space.cardHeight / 2
const height = Space.cardHeight / 2 - 65

export default class OurBoardRegion extends Region {
  // Function called when elements in this region are interacted with
  callback: (i: number) => void
  displayCostCallback: (cost: number) => void

  // Whether we have already clicked on a card to play it
  cardClicked: boolean

  // Whether hotkeys for the cards have been registered
  cardHotkeysRegistered = false

  // Index of the card from the last state that was being hovered, if any
  hoveredCard: number

  // Track which card is currently raised
  raisedCardIndex: number | null = null

  create(scene: GameScene, avatarId: number): this {
    this.scene = scene

    this.container = scene.add
      .container(0, Space.windowHeight)
      .setDepth(Depth.ourHand)

    this.createBackground(scene)

    return this
  }

  private addCardHotkeys() {
    const numberWords = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX']

    for (let i = 0; i < MechanicsSettings.HAND_CAP; i++) {
      // Remove existing listeners and add new ones
      this.scene.input.keyboard.removeListener(`keydown-${numberWords[i]}`)
      this.scene.input.keyboard.on(`keydown-${numberWords[i]}`, () => {
        if (UserSettings._get('hotkeys')) {
          if (this.cards[i] === undefined) {
            this.scene.signalError(`You don't have a card in slot ${i + 1}`)
          } else {
            this.cards[i].clickCallback()
          }
        }
      })
    }
  }

  // Set the callback / error message for when card is clicked
  private setCardOnClick(card: CardImage, state: GameModel, i: number) {
    card.setOnClick(() => {
      // If this card is already raised, try to play it
      if (this.raisedCardIndex === i) {
        // Check if there are any errors that prevent playing
        let msg
        if (state.winner !== null) {
          msg = 'The game is over.'
        } else if (!state.mulligansComplete[1]) {
          msg = 'Opponent still mulliganing.'
        } else if (state.isRecap) {
          msg = 'The story is resolving.'
        } else if (state.priority === 1) {
          msg = "It's not your turn."
        } else if (state.cardCosts[i] > state.breath[0]) {
          msg = 'Not enough breath.'
        }

        if (msg !== undefined) {
          this.scene.signalError(msg)
          return
        }

        // If no errors, play the card
        this.onCardPlay(i, card, this.cards, state)()
      } else {
        // Always allow raising the card
        // Lower any currently raised card
        if (this.raisedCardIndex !== null) {
          const raisedCard = this.cards[this.raisedCardIndex]
          this.scene.tweens.add({
            targets: raisedCard.container,
            y: 65,
            duration: Time.playCard() / 2,
            ease: 'Sine.easeOut',
          })
        }

        // Raise this card
        this.scene.tweens.add({
          targets: card.container,
          y: -HOVER_OFFSET,
          duration: Time.playCard() / 2,
          ease: 'Sine.easeOut',
        })
        this.raisedCardIndex = i
      }
    })
  }

  private createBackground(scene: Phaser.Scene): void {
    const background = this.scene.add
      .rectangle(0, 0, Space.windowWidth, height, Color.backgroundLight)
      .setOrigin(0, 1)

    this.container.add(background)
  }

  // Rename old onCardClick to onCardPlay
  private onCardPlay(
    i: number,
    card: CardImage,
    hand: CardImage[],
    state: GameModel,
  ): () => void {
    const nextStoryPosition = CardLocation.story(
      state,
      state.story.acts.length,
      this.container,
      0,
    )

    return () => {
      if (this.scene['paused']) {
        return
      }

      // Reset raised card tracking
      this.raisedCardIndex = null

      // Remove hover behavior
      card.removeOnHover()

      // Hide any hints
      this.scene['hint'].hide()

      // Send card to story
      this.scene.tweens.add({
        targets: card.container,
        x: nextStoryPosition[0],
        y: nextStoryPosition[1],
        duration: Time.playCard(),
        ease: 'Sine.easeInOut',
        onStart: () => {
          setTimeout(() => {
            this.scene.hint.hide()

            // Fill in the hole where the card was
            for (let j = i + 1; j < hand.length; j++) {
              let adjustedCard = hand[j]
              this.scene.tweens.add({
                targets: adjustedCard.container,
                x: CardLocation.ourHand(state, j - 1, this.container)[0],
                duration: Time.playCard() - 10,
                ease: 'Sine.easeInOut',
              })
            }

            this.callback(i)
          }, 10)
        },
        onComplete: () => {
          this.scene.playSound('play')
          card.container.parentContainer.sendToBack(card.container)
        },
      })
    }
  }

  // Modify displayState to lower any raised card when state changes
  displayState(state: GameModel): void {
    this.deleteTemp()

    // Until we have mulliganed, hide (Delete) all the cards in our hand
    if (!state.mulligansComplete[0]) {
      this.deleteTemp()
      return
    } else if (!this.cardHotkeysRegistered) {
      this.addCardHotkeys()
      this.cardHotkeysRegistered = true
    }

    // Add each of the cards in our hand
    this.cards = []
    for (let i = 0; i < state.hand[0].length; i++) {
      let card = this.addCard(
        state.hand[0][i],
        CardLocation.ourHand(state, i, this.container),
      )
        .setCost(state.cardCosts[i])
        .setFocusOptions('Play')
        .moveToTopOnHover()

      // If this was the raised card, raise it again
      if (i === this.raisedCardIndex) {
        card.container.setY(-HOVER_OFFSET)
      }

      const cost = state.cardCosts[i]
      card.setOnHover(
        this.onCardHover(card, cost, i),
        this.onCardExit(card, cost, i),
      )

      // Set whether the card shows as playable, and set its onclick
      card.setPlayable(state.cardCosts[i] <= state.breath[0])
      this.setCardOnClick(card, state, i)

      this.cards.push(card)
      this.temp.push(card)
    }

    // Hover whichever card was being hovered last
    if (this.hoveredCard !== undefined) {
      let card = this.cards[this.hoveredCard]

      if (card !== undefined) {
        // Check that the mouse is still over the card's x
        const pointer = this.scene.input.activePointer
        const pointerOverCard = card.image
          .getBounds()
          .contains(pointer.x, pointer.y + HOVER_OFFSET)

        if (pointerOverCard) {
          card.image.emit('pointerover')
        }
      }
    }
  }

  // Remove the hover movement since we're using click to raise now
  private onCardHover(
    card: CardImage,
    cost: number,
    index: number,
  ): () => void {
    return () => {
      // Only show cost, don't move card
      this.displayCostCallback(cost)
    }
  }

  private onCardExit(card: CardImage, cost: number, index: number): () => void {
    return () => {
      // Only hide cost, don't move card
      this.displayCostCallback(0)
    }
  }

  // Set the callback for when a card in this region is clicked on
  setCardClickCallback(f: (x: number) => void): Region {
    this.callback = f
    return this
  }

  // Set the callback for showing how much breath a card costs
  setDisplayCostCallback(f: (cost: number) => void): void {
    this.displayCostCallback = f
  }
}
