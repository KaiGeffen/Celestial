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
} from '../../settings/settings'
import BaseScene from '../baseScene'
import Region from './baseRegion'
import CardLocation from './cardLocation'
import { GameScene } from '../gameScene'
import { MechanicsSettings } from '../../../../shared/settings'

// The y distance card moves up when hovered
const HOVER_OFFSET = Space.cardHeight / 2

export default class OurHandRegion extends Region {
  // Function called when elements in this region are interacted with
  callback: (i: number) => void
  displayCostCallback: (cost: number) => void

  priority: Phaser.GameObjects.Image

  btnDeck: Button
  btnDiscard: Button

  btnInspire: Button
  btnNourish: Button
  btnSight: Button

  // Whether we have already clicked on a card to play it
  cardClicked: boolean

  // Whether hotkeys for the cards have been registered
  cardHotkeysRegistered = false

  // Index of the card from the last state that was being hovered, if any
  hoveredCard: number

  // Avatar image
  btnAvatar: Button

  create(scene: GameScene, avatarId: number): OurHandRegion {
    this.scene = scene

    this.container = scene.add
      .container(0, Space.windowHeight - Space.handHeight)
      .setDepth(Depth.ourHand)

    // Visual effect that highlights when we have priority
    this.priority = scene.add
      .image(0, Space.handHeight, 'chrome-BottomPriority')
      .setVisible(false)
      .setOrigin(0, 1)
      .setDepth(-1)

    this.priority.setDisplaySize(Space.windowWidth, this.priority.height)
    this.container.add(this.priority)

    // Create the status visuals
    this.createStatusDisplay()

    // Create our avatar
    this.btnAvatar = this.createAvatar(avatarId)

    // Create a visual divider
    // let divide = scene.add.image(Space.windowWidth - 300 - Space.cardWidth/2, Space.handHeight/2, 'icon-Divide')

    // Deck and discard pile totals
    if (Flags.mobile) {
      this.btnDeck = new Buttons.Stacks.Deck(
        this.container,
        Space.windowWidth - 169,
        Space.handHeight / 2,
        0,
      )
      this.btnDiscard = new Buttons.Stacks.Discard(
        this.container,
        Space.windowWidth - 111,
        Space.handHeight / 2,
        0,
      )
    } else {
      const x = Space.windowWidth - 294
      this.btnDeck = new Buttons.Stacks.Deck(
        this.container,
        x,
        (Space.handHeight * 1) / 4,
        0,
      )
      this.btnDiscard = new Buttons.Stacks.Discard(
        this.container,
        x,
        (Space.handHeight * 3) / 4,
        0,
      )
    }

    this.addOverlayHotkeys()

    return this
  }

  displayState(state: GameModel): void {
    this.deleteTemp()

    // Priority
    this.priority.setVisible(!state.isRecap && state.priority === 0)

    // Pile sizes
    this.btnDeck.setText(`${state.deck[0].length}`)
    this.btnDiscard.setText(`${state.pile[0].length}`)

    // Until we have mulliganed, hide the cards in our hand
    if (!state.mulligansComplete[0]) {
      this.hideHand()
      return
    } else if (!this.cardHotkeysRegistered) {
      this.addCardHotkeys()
      this.cardHotkeysRegistered = true
    }

    this.cardClicked = false

    let that = this

    // Statuses
    this.displayStatuses(state)

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

      const cost = state.cardCosts[i]
      card.setOnHover(
        that.onCardHover(card, cost, i),
        that.onCardExit(card, this.cards, i),
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

  private addOverlayHotkeys() {
    // Deck
    this.scene.input.keyboard.on('keydown-Q', () => {
      if (UserSettings._get('hotkeys')) {
        this.btnDeck.onClick()
      }
    })

    // Discard
    this.scene.input.keyboard.on('keydown-W', () => {
      if (UserSettings._get('hotkeys')) {
        this.btnDiscard.onClick()
      }
    })
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

  setOverlayCallbacks(fDeck: () => void, fDiscard: () => void): void {
    this.btnDeck.setOnClick(fDeck)
    this.btnDiscard.setOnClick(fDiscard)
  }

  showUsername(username: string): void {
    this.container.add(
      this.scene.add
        .text(
          21 + Space.avatarSize / 2,
          11 + Space.avatarSize,
          username,
          Style.username,
        )
        .setOrigin(0.5, 0),
    )
  }

  // Set the callback / error message for when card is clicked
  private setCardOnClick(card: CardImage, state: GameModel, i: number) {
    // Set whether card shows up as playable, and also whether we can click to play a card in this state
    if (state.cardCosts[i] > state.breath[0]) {
      card.setPlayable(false)
    }

    card.setOnClick(() => {
      // Check if there are any errors
      let msg
      if (state.winner !== null) {
        msg = 'The game is over.'
      } else if (this.scene.opponentDisconnected) {
        msg = 'Your opponent has disconnected.'
      } else if (!state.mulligansComplete[1]) {
        msg = 'Opponent still mulliganing.'
      } else if (state.isRecap) {
        msg = 'The story is resolving.'
      } else if (state.priority === 1) {
        msg = "It's not your turn."
      } else if (this.cardClicked) {
        msg = "You've already selected a card."
      } else if (state.cardCosts[i] > state.breath[0]) {
        msg = 'Not enough breath.'
      }

      if (msg !== undefined) {
        this.scene.signalError(msg)
      } else {
        this.onCardClick(i, card, this.cards, state)()
      }
    })
  }

  // Hide the cards in our hand, used when mulligan is visible
  hideHand(): void {
    this.deleteTemp()
  }

  private createAvatar(avatarId: number): Button {
    console.log('createAvatar called with ID:', avatarId)

    if (Flags.mobile) {
      return this.createAvatarMobile(avatarId)
    }

    let btn = new Buttons.Avatar(this.container, 21, 11, avatarId)
      .setOrigin(0)
      .setQuality({ emotive: true })

    // Sight
    this.btnSight = new Buttons.Keywords.Sight(
      this.container,
      btn.icon.x + Space.avatarSize / 2,
      btn.icon.y + Space.avatarSize - Space.padSmall,
    )
      .setOrigin(0.5, 1)
      .setVisible(false)

    return btn
  }

  private createAvatarMobile(avatarId: number): Button {
    let btn = new Buttons.Avatar(this.container, 10, -10, avatarId)
      .setOrigin(0)
      .setQuality({ emotive: true })

    // Sight
    this.btnSight = new Buttons.Keywords.Sight(
      this.container,
      btn.icon.x + Space.avatarSize / 2,
      btn.icon.y + Space.avatarSize - Space.padSmall,
    )
      .setOrigin(0.5, 1)
      .setVisible(false)

    return btn
  }

  private createStatusDisplay(): void {
    if (!Flags.mobile) {
      let x = 21 + Space.avatarSize - 10

      // Inspire
      let y = 11
      this.btnInspire = new Buttons.Keywords.Inspire(this.container, x - 15, y)
        .setOrigin(0)
        .setVisible(false)

      // Nourish
      y += Space.avatarSize / 2
      this.btnNourish = new Buttons.Keywords.Nourish(this.container, x - 15, y)
        .setOrigin(0)
        .setVisible(false)
    } else {
      // Top center of avatar
      let x = 10 + Space.avatarSize / 2
      const dx = Space.avatarSize / 4
      let y = -10

      this.btnInspire = new Buttons.Keywords.Inspire(
        this.container,
        x + dx,
        y - 10,
      ).setVisible(false)
      this.btnNourish = new Buttons.Keywords.Nourish(
        this.container,
        x - dx,
        y - 10,
      ).setVisible(false)
    }
  }

  // Return the function that runs when card with given index is clicked on
  private onCardClick(
    i: number,
    card: CardImage,
    hand: CardImage[],
    state: GameModel,
  ): () => void {
    // The position these cards will move to if played
    const nextStoryPosition = CardLocation.story(
      state,
      state.story.acts.length,
      this.container,
      0,
    )

    return () => {
      // If the match is paused, do nothing
      if (this.scene['paused']) {
        return
      }

      // If we have already played a card, do nothing when clicking on another
      if (this.cardClicked) {
        return
      }

      // Remember this we have clicked a card already
      this.cardClicked = true

      // Revert the order of the cards in hand to not center this card
      card.revertCenteringInHand()

      // Remove this cards hover/exit behavior so it doesn't jump back to hand y
      card.removeOnHover()

      // Hide any hints
      this.scene['hint'].hide()

      // Send this card to its place in the story
      this.scene.tweens.add({
        targets: card.container,
        x: nextStoryPosition[0],
        y: nextStoryPosition[1],
        duration: Time.playCard(),
        ease: 'Sine.easeInOut',
        // After brief delay, tell network, hide info, shift cards to fill its spot
        onStart: () => {
          setTimeout(() => {
            // Hide any hint that might be showing
            this.scene.hint.hide()

            // Fill in the hole where the card was
            // For every card later than i, move to the right
            for (let j = i + 1; j < hand.length; j++) {
              let adjustedCard = hand[j]

              this.scene.tweens.add({
                targets: adjustedCard.container,
                // TODO Fix this to be in general (Space to move might be smaller if cards squished)
                x: CardLocation.ourHand(state, j - 1, this.container)[0],
                duration: Time.playCard() - 10,
                ease: 'Sine.easeInOut',
              })
            }

            // Trigger the callback function for this card
            this.callback(i)
          }, 10)
        },
        // Play 'play' sound, remember which card is being hovered
        onComplete: () => {
          this.scene.playSound('play')

          // Slip card behind the hand background
          card.container.parentContainer.sendToBack(card.container)

          if (this.hoveredCard !== undefined) {
            // If the played card was hovered, forget that
            if (this.hoveredCard === i) {
              this.hoveredCard = undefined
            }
            // If a later card was hovered, adjust down to fill this card leaving hand
            else if (this.hoveredCard > i) {
              this.hoveredCard -= 1
            }
          }
        },
      })
    }
  }

  // Return the function that runs when given card is hovered
  private onCardHover(
    card: CardImage,
    cost: number,
    index: number,
  ): () => void {
    let that = this
    return () => {
      card.container.setY(Space.handHeight - HOVER_OFFSET)

      // Show the card's cost in the breath icon
      that.displayCostCallback(cost)

      // Remember that this card is being hovered
      that.hoveredCard = index
    }
  }

  // Return the function that runs when given card hover is exited
  private onCardExit(
    card: CardImage,
    cards: CardImage[],
    index: number,
  ): () => void {
    let that = this
    return () => {
      card.container.setY(HOVER_OFFSET)

      // Stop showing a positive card cost
      that.displayCostCallback(0)

      // Remember that no card is being hovered now
      that.hoveredCard = undefined
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

  setEmoteCallback(fEmote: () => void): void {
    this.btnAvatar.setOnClick(fEmote, false, false)
  }

  private displayStatuses(state: GameModel): void {
    // Specific to 4 TODO
    let amts = [0, 0, 0, 0]
    const length = 4

    state.status[0].forEach(function (status, index, array) {
      amts[status]++
    })

    const amtInspire = amts[1]
    const amtNourish = amts[2] - amts[3]

    this.btnInspire.setVisible(amtInspire !== 0).setText(`${amtInspire}`)

    this.btnNourish.setVisible(amtNourish !== 0).setText(`${amtNourish}`)

    this.btnSight
      .setVisible(state.vision[0] !== 0)
      .setText(`${state.vision[0]}`)
  }

  // TUTORIAL FUNCTIONALITY
  hideStacks(): Region {
    this.btnDeck.setVisible(false)
    this.btnDiscard.setVisible(false)

    return this
  }
}
