import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { MatchScene } from '../matchScene'
import { Animation } from '../../../../shared/animation'
import { Zone } from '../../../../shared/state/zone'
import CardLocation from './cardLocation'
import { CardImage } from '../../lib/cardImage'
import { Space, Time, Depth, Ease } from '../../settings/settings'
import Catalog from '../../../../shared/state/catalog'
import { View } from '../matchScene'
import Card from '../../../../shared/state/card'

export default class Animator {
  scene: MatchScene
  view: View
  container: Phaser.GameObjects.Container

  // In the last state, which cards were hidden in the story
  lastHiddenCards: boolean[] = []

  constructor(scene: MatchScene, view: View) {
    this.scene = scene
    this.view = view
    this.container = scene.add.container().setDepth(Depth.aboveOtherCards)
  }

  animate(state: GameModel): void {
    // Animate any cards being revealed
    this.animateAllReveals(state)

    for (let owner = 0; owner < 2; owner++) {
      for (let i = 0; i < state.animations[owner].length; i++) {
        let animation = state.animations[owner][i]

        if (animation.from === Zone.Mulligan) {
          this.animateMulligan(animation, owner, i, state)
        }
        // Shuffle a player's deck
        else if (animation.from === Zone.Shuffle) {
          this.animateShuffle(owner, i)
        }
        // Transform a card
        else if (animation.from === Zone.Transform) {
          this.animateTransform(animation, i, owner)
        } else if (animation.from === Zone.Status) {
          // TODO
        }
        // In all other cases, move it from start to end
        else {
          let start = this.getStart(animation, state, owner)
          let end = this.getEnd(animation, state, owner)

          let card = this.createCard(animation.card, start)

          if (animation.to !== animation.from) {
            // Get the cardImage that this card becomes upon completion, if there is one
            let permanentCard = this.getCard(animation, owner)

            // Show the card in motion between start and end
            this.animateCard(
              card,
              end,
              i,
              permanentCard,
              this.getSound(animation),
            )
          } else {
            // Emphasize the card if it stayed in the same zone
            this.animateEmphasis(card, i)
          }
        }
      }
    }

    this.lastHiddenCards = this.getHiddenCards(state)
  }

  private getStart(
    animation: Animation,
    state,
    owner: number,
  ): [number, number] {
    switch (animation.from) {
      case Zone.Mulligan:
        return CardLocation.mulligan(this.container, animation.index)

      case Zone.Deck:
        if (owner === 0) {
          return CardLocation.ourDeck()
        } else {
          return CardLocation.theirDeck(this.container)
        }

      case Zone.Story:
        return CardLocation.story(state, animation.index, this.container, owner)

      case Zone.Gone:
        return CardLocation.gone(this.container)

      case Zone.Hand:
        if (owner === 0) {
          return CardLocation.ourHand(state, animation.index)
        } else {
          return CardLocation.theirHand(state, animation.index, this.container)
        }

      case Zone.Discard:
        if (owner === 0) {
          return CardLocation.ourDiscard(this.container)
        } else {
          return CardLocation.theirDiscard(this.container)
        }
    }

    return [300, 300]
  }

  private getEnd(animation: Animation, state, owner): [number, number] {
    switch (animation.to) {
      case Zone.Deck:
        if (owner === 0) {
          return CardLocation.ourDeck()
        } else {
          return CardLocation.theirDeck(this.container)
        }

      // TODO Clarify index 1 and 2, mostly 2 seems to be null
      case Zone.Story:
        return CardLocation.story(
          state,
          animation.index2,
          this.container,
          owner,
        )

      case Zone.Gone:
        return CardLocation.gone(this.container)

      case Zone.Mulligan:
        return CardLocation.mulligan(this.container, animation.index)

      case Zone.Hand:
        if (owner === 0) {
          return CardLocation.ourHand(state, animation.index2)
        } else {
          return CardLocation.theirHand(state, animation.index2, this.container)
        }

      case Zone.Discard:
        if (owner === 0) {
          return CardLocation.ourDiscard(this.container)
        } else {
          return CardLocation.theirDiscard(this.container)
        }
    }

    return [300, 300]
  }

  private createCard(card: Card, start: [number, number] = [0, 0]): CardImage {
    let cardImage = new CardImage(
      card || Catalog.cardback,
      this.container,
      false,
    )

    // Set its initial position and make it hidden until its tween plays
    cardImage.setPosition(start)
    cardImage.hide()

    return cardImage
  }

  // Get the cardImage referenced by this animation
  private getCard(animation: Animation, owner: number): CardImage {
    let card

    switch (animation.to) {
      case Zone.Hand:
        if (owner === 0) {
          // TODO Check length
          card = this.view.ourBoard.cards[animation.index2]
        } else {
          card = this.view.theirBoard.cards[animation.index2]
        }
        break

      case Zone.Story:
        // TODO The local array has includes resolved cards, while the animation index doesn't, causing a bug
        card = this.view.story.cards[animation.index2]
        break

      case Zone.Mulligan:
        // Only show our mulligans
        // TODO Should this be index2?
        card = this.view.mulligan.cards[animation.index]
        break

      case Zone.Deck:
        if (owner === 0) {
          card = null //// this.view.decks.cards[animation.index2]
        } else {
          card = null //this.view.decks.cards2[animation.index2]
        }
        break

      case Zone.Discard:
        if (owner === 0) {
          card = null //this.view.discardPiles.cards[animation.index2]
        } else {
          card = null //this.view.discardPiles.cards2[animation.index2]
        }
        break

      // // TODO
      // break
      // card = this.view.decks.cards

      // case Zone.Discard:
      // // TODO
      // break

      // case Zone.Gone:
      // case Zone.Create:
      // default:
      default:
        break
    }
    return card
  }

  // Animate the given card moving to given end position with given delay
  // If a permanent card is specified, that's the image that should become visible when tween completes
  private animateCard(
    card: CardImage,
    end: [number, number],
    i: number,
    permanentCard?: CardImage,
    sound?,
  ) {
    if (permanentCard) {
      permanentCard.hide()
    }

    // Animate moving x direction, becoming visible when animation starts
    this.scene.tweens.add({
      targets: card.container,
      x: end[0],
      y: end[1],
      delay: i * Time.recapTweenWithPause(),
      duration: Time.recapTween(),
      ease: Ease.card,
      onStart: (tween: Phaser.Tweens.Tween, targets, _) => {
        card.show()
        if (sound) {
          this.scene.playSound(sound)
        }
      },
      onComplete: (tween, targets, _) => {
        if (permanentCard) {
          permanentCard.show()
        }
        card.destroy()
      },
    })
  }

  // Animate a card being thrown back into the deck during mulligan phase
  private animateMulligan(
    animation: Animation,
    owner: number,
    iAnimation: number,
    state: GameModel,
  ) {
    // Should end in deck or hand
    const end = this.getEnd(animation, state, owner)
    const start = this.getStart(animation, state, owner)

    // Make a new cardImage of this card
    let cardImage = this.createCard(animation.card, start).show()

    let permanentCard = this.getCard(animation, owner)

    this.animateCard(
      cardImage,
      end,
      iAnimation,
      permanentCard,
      this.getSound(animation),
    )
  }

  // Animate the given player's deck shuffling
  private animateShuffle(owner: number, i: number): void {
    let start
    if (owner === 0) {
      start = CardLocation.ourDeck()
    } else {
      start = CardLocation.theirDeck()
    }

    let topCard = this.createCard(Catalog.cardback, start)
    let bottomCard = this.createCard(Catalog.cardback, start)

    this.scene.add.tween({
      targets: topCard.container,
      x: start[0] + Space.cardWidth / 4,
      delay: i * Time.recapTweenWithPause(),
      duration: Time.recapTween() / 4,
      yoyo: true,
      repeat: 1,
      onStart: (tween: Phaser.Tweens.Tween, targets, _) => {
        topCard.show()
        this.scene.playSound('shuffle')
      },
      onComplete: function (tween, targets, _) {
        topCard.destroy()
      },
    })

    this.scene.add.tween({
      targets: bottomCard.container,
      x: start[0] - Space.cardHeight / 2,
      delay: i * Time.recapTweenWithPause(),
      duration: Time.recapTween() / 4,
      yoyo: true,
      repeat: 1,
      onStart: function (tween: Phaser.Tweens.Tween, targets, _) {
        bottomCard.show()
      },
      onComplete: function (tween, targets, _) {
        bottomCard.destroy()
      },
    })
  }

  // Animate a card being emphasized in its place, such as showing that a Morning card is proccing
  private animateEmphasis(card: CardImage, i: number): void {
    let cardCopy = this.createCard(card.card, [0, 0]).copyLocation(card)

    // Animate card scaling up and disappearing
    this.scene.tweens.add({
      targets: cardCopy.container,
      scale: 3,
      alpha: 0,
      delay: i * Time.recapTweenWithPause(),
      duration: Time.recapTween(),
      onStart: function (tween: Phaser.Tweens.Tween, targets, _) {
        cardCopy.show()
      },
      onComplete: function (tween, targets, _) {
        cardCopy.destroy()
      },
    })
  }

  // Animate all cards newly revealed on this state
  private animateAllReveals(state: GameModel): void {
    let acts = state.story.acts
    let amtSeen = 0
    for (let i = 0; i < acts.length; i++) {
      // If it was hidden, flip it over
      if (this.lastHiddenCards[i]) {
        let card = this.view.story.cards[i]

        if (card.card.id !== Catalog.cardback.id) {
          this.animateReveal(card, amtSeen)
          amtSeen++
        }
      }
    }
  }

  // Animate a card being revealed
  private animateReveal(card: CardImage, i: number): void {
    // Animate the back of the card flipping
    let hiddenCard = this.createCard(Catalog.cardback, [0, 0])
      .show()
      .copyLocation(card)

    this.scene.tweens.add({
      targets: hiddenCard.container,
      scaleX: 0,
      delay: i * Time.recapTweenWithPause(),
      duration: Time.recapTween() / 2,
      onComplete: function (tween, targets, _) {
        hiddenCard.destroy()
      },
    })

    // Animate the actual card flipping up
    card.hide()
    card.container.scaleX = 0
    this.scene.tweens.add({
      targets: card.container,
      scaleX: 1,
      delay: i * Time.recapTweenWithPause() + Time.recapTween() / 2,
      duration: Time.recapTween() / 2,
      onStart: function (tween: Phaser.Tweens.Tween, targets, _) {
        card.show()
      },
    })
  }

  // Animate a card transforming into another card
  private animateTransform(animation: Animation, i: number, owner): void {
    let newCard = this.getCard(animation, owner)
    let oldCard = this.createCard(animation.card).show().copyLocation(newCard)

    // Animate card scaling up and disappearing
    this.scene.tweens.add({
      targets: oldCard.container,
      alpha: 0,
      delay: i * Time.recapTweenWithPause(),
      duration: Time.recapTween(),
      onComplete: function (tween, targets, _) {
        oldCard.destroy()
      },
    })
  }

  private getHiddenCards(state: GameModel): boolean[] {
    let result = []

    for (let i = 0; i < state.story.acts.length; i++) {
      result[i] = state.story.acts[i].card.id === Catalog.cardback.id
    }

    return result
  }

  private getSound(animation: Animation): string {
    switch (animation.to) {
      case Zone.Hand:
        switch (animation.from) {
          case Zone.Deck:
          case Zone.Mulligan:
            return 'draw'
          default:
            return 'create'
        }
        return 'draw'
      case Zone.Discard:
        return 'discard'
      // TODO Some other sound?
      case Zone.Deck:
        return 'discard'
      case Zone.Mulligan:
        return 'draw'
    }
    return undefined
  }
}
