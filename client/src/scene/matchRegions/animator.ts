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
import { SHRUNKEN_CARD_SCALE } from './matchRegionSettings'

export default class Animator {
  scene: MatchScene
  view: View
  container: Phaser.GameObjects.Container

  // In the last state, which cards were hidden in the story
  lastHiddenCards: boolean[] = []

  /**
   * End-of-previous-`animate` snapshot (same role as StoryRegion’s prev score / nourish /
   * resolved count at the start of the next `displayState`).
   */
  private snapshotResolvedActCount = 0
  private snapshotScore: [number, number] = [0, 0]
  private snapshotStatusNourish: [number, number] = [0, 0]

  constructor(scene: MatchScene, view: View) {
    this.scene = scene
    this.view = view
    this.container = scene.add.container().setDepth(Depth.aboveOtherCards)
  }

  animate(state: GameModel): void {
    this.animateAllReveals(state)

    const bubbleSlots = this.computeRecapBubbleTweenSlots(state)

    for (let owner = 0; owner < 2; owner++) {
      for (let i = 0; i < state.animations[owner].length; i++) {
        let animation = state.animations[owner][i]
        const slot = i + bubbleSlots

        if (animation.from === Zone.Mulligan) {
          this.animateMulligan(animation, owner, slot, state)
        }
        // Shuffle a player's deck
        else if (animation.from === Zone.Shuffle) {
          this.animateShuffle(owner, slot)
        }
        // Transform a card
        else if (animation.from === Zone.Transform) {
          this.animateTransform(animation, slot, owner)
        } else if (animation.from === Zone.Status) {
          // TODO Clarify all this and make a negative nourish sound
          // if (animation.index === 0) {
          //   this.scene.playSound('inspire')
          // } else if (animation.index === 1) {
          //   this.scene.playSound('nourish')
          // } else if (animation.index === -1) {
          //   this.scene.playSound('nourish')
          // }
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
              slot,
              permanentCard,
              this.getSound(animation),
              animation.to === Zone.Story ? SHRUNKEN_CARD_SCALE : undefined,
            )
          } else {
            // Emphasize the card if it stayed in the same zone
            this.animateEmphasis(card, slot)
          }
        }
      }
    }

    this.lastHiddenCards = this.getHiddenCards(state)

    // Take a snapshot of the state to use next state to see the changes
    this.snapshotResolvedActCount = state.story.resolvedActs.length
    this.snapshotScore = [state.score[0], state.score[1]]
    this.snapshotStatusNourish = [
      state.status[0].nourish,
      state.status[1].nourish,
    ]
  }

  /**
   * Matches resolve-bubble tween branches for the newest resolved act when exactly one act
   * was added since {@link snapshotResolvedActCount} (parallel to StoryRegion bookkeeping).
   */
  private computeRecapBubbleTweenSlots(state: GameModel): number {
    const resolvedCount = state.story.resolvedActs.length
    const oneNewResolvedAct =
      resolvedCount === this.snapshotResolvedActCount + 1 && resolvedCount > 0

    if (!oneNewResolvedAct) {
      return 0
    }

    const act = state.story.resolvedActs[resolvedCount - 1]
    const owner = act.owner
    const tweenBubbleFromStat = true
    const nourishAmt = this.snapshotStatusNourish[owner]
    const pointsEarned = state.score[owner] - this.snapshotScore[owner]
    const printedPoints = act.card.points
    const effectAmt = pointsEarned - printedPoints - nourishAmt
    const showEffectsBubble = act.card.name !== 'Pet'
    const tweenNourishFromStatus = nourishAmt !== 0
    const tweenEffectsFromStatus =
      effectAmt !== 0 && showEffectsBubble

    let n = 0
    if (tweenBubbleFromStat) n++
    if (nourishAmt !== 0 && tweenNourishFromStatus) n++
    if (effectAmt !== 0 && showEffectsBubble && tweenEffectsFromStatus) n++
    return n
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
        return CardLocation.story(
          state,
          state.story.resolvedActs.length + (animation.index ?? 0),
          this.container,
          owner,
        )

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
          state.story.resolvedActs.length + (animation.index2 ?? 0),
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
    endScale?: number,
  ) {
    if (permanentCard) {
      permanentCard.hide()
    }

    // Animate moving x direction, becoming visible when animation starts
    this.scene.tweens.add({
      targets: card.container,
      x: end[0],
      y: end[1],
      ...(endScale !== undefined ? { scaleX: endScale, scaleY: endScale } : {}),
      delay: i * (Time.match.recapTween + Time.match.recapPauseBetweenTweens),
      duration: Time.match.recapTween,
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
      animation.to === Zone.Story ? SHRUNKEN_CARD_SCALE : undefined,
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
      delay: i * (Time.match.recapTween + Time.match.recapPauseBetweenTweens),
      duration: Time.match.recapTween / 4,
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
      delay: i * (Time.match.recapTween + Time.match.recapPauseBetweenTweens),
      duration: Time.match.recapTween / 4,
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
      delay: i * (Time.match.recapTween + Time.match.recapPauseBetweenTweens),
      duration: Time.match.recapTween,
      onStart: function (tween: Phaser.Tweens.Tween, targets, _) {
        cardCopy.show()
      },
      onComplete: function (tween, targets, _) {
        cardCopy.destroy()
      },
    })
  }

  // Animate all cards newly revealed on this state (runs before resolve-bubble recap stagger)
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
    const endScaleX = card.container.scaleX
    const endScaleY = card.container.scaleY

    // Animate the back of the card flipping
    let hiddenCard = this.createCard(Catalog.cardback, [0, 0])
      .show()
      .copyLocation(card)
    hiddenCard.container.setScale(endScaleX, endScaleY)

    this.scene.tweens.add({
      targets: hiddenCard.container,
      scaleX: 0,
      delay: i * (Time.match.recapTween + Time.match.recapPauseBetweenTweens),
      duration: Time.match.recapTween / 2,
      onComplete: function (tween, targets, _) {
        hiddenCard.destroy()
      },
    })

    // Animate the actual card flipping up
    card.hide()
    card.container.scaleX = 0
    this.scene.tweens.add({
      targets: card.container,
      scaleX: endScaleX,
      delay:
        i * (Time.match.recapTween + Time.match.recapPauseBetweenTweens) +
        Time.match.recapTween / 2,
      duration: Time.match.recapTween / 2,
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
      delay: i * (Time.match.recapTween + Time.match.recapPauseBetweenTweens),
      duration: Time.match.recapTween,
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
