import 'phaser'
import Card from '../../../../shared/state/card'
import { CardImage } from '../../lib/cardImage'
import GameModel from '../../../../shared/state/gameModel'
import { Color, Depth, Space, Style } from '../../settings/settings'
import { GameScene } from '../gameScene'
import Region from './baseRegion'
import CardLocation from './cardLocation'
import Buttons from '../../lib/buttons/buttons'

export default class OverlayRegion extends Region {
  txtTitle: Phaser.GameObjects.Text

  create(scene: GameScene, title: string): OverlayRegion {
    this.scene = scene

    this.container = scene.add
      .container()
      .setDepth(Depth.pileOverlays)
      .setVisible(false)

    // TODO Anchor and have the cards stay centered after a resize

    // Create the background
    let background = scene.add
      .rectangle(0, 0, 1, 1, Color.darken, 0.8)
      .setOrigin(0)
      .setInteractive()
      .on('pointerdown', () => this.container.setVisible(false))

    // Anchor background
    scene.plugins.get('rexAnchor')['add'](background, {
      width: `100%`,
      height: `100%`,
    })

    // TODO Hide during mulligan, adjust to pile sizes, text specific to each pile
    this.txtTitle = scene.add
      .text(
        Space.windowWidth / 2,
        Space.windowHeight / 2 + Space.cardHeight / 2,
        title,
        Style.announcementOverBlack,
      )
      .setOrigin(0.5, 0)

    this.container.add([background, this.txtTitle])

    return this
  }

  displayState(state: GameModel): void {}

  // Set the callback for this overlay switching to another
  setSwitch(callback: () => void): this {
    new Buttons.Basic({
      within: this.container,
      text: 'Other',
      x: Space.pad + Space.buttonWidth / 2,
      y: Space.pad + Space.buttonHeight / 2,
      f: callback,
    })

    return this
  }

  protected displayCards(cards: Card[]): void {
    this.deleteTemp()

    const total = cards.length
    for (let i = 0; i < total; i++) {
      this.addOverlayCard(cards[i], i, total)
    }

    this.txtTitle.setVisible(total <= 15)
  }

  // Add a card to this overlay
  private addOverlayCard(card: Card, i: number, total: number): CardImage {
    const titleHeight = this.txtTitle.height
    let position = CardLocation.overlay(this.container, i, total, titleHeight)

    let cardImage = this.addCard(card, position).moveToTopOnHover()

    this.temp.push(cardImage)

    return cardImage
  }
}

export class OurDeckOverlay extends OverlayRegion {
  create(scene: GameScene): OverlayRegion {
    return super.create(scene, 'Your Deck')
  }

  displayState(state: GameModel): void {
    this.displayCards(state.deck[0])
  }
}

export class TheirDeckOverlay extends OverlayRegion {
  create(scene: GameScene): OverlayRegion {
    return super.create(scene, 'Their Last Shuffle')
  }

  displayState(state: GameModel): void {
    this.displayCards(state.lastShuffle[1])
  }
}

export class OurDiscardOverlay extends OverlayRegion {
  create(scene: GameScene): OverlayRegion {
    super.create(scene, 'Your Discard Pile')

    return this
  }

  displayState(state: GameModel): void {
    this.displayCards(state.pile[0])
  }
}

export class TheirDiscardOverlay extends OverlayRegion {
  create(scene: GameScene): OverlayRegion {
    return super.create(scene, 'Their Discard Pile')
  }

  displayState(state: GameModel): void {
    this.displayCards(state.pile[1])
  }
}

export class OurExpendedOverlay extends OverlayRegion {
  create(scene: GameScene): OverlayRegion {
    super.create(scene, 'Your Removed From Game Cards')

    return this
  }

  displayState(state: GameModel): void {
    this.displayCards(state.expended[0])
  }
}

export class TheirExpendedOverlay extends OverlayRegion {
  create(scene: GameScene): OverlayRegion {
    return super.create(scene, 'Their Removed From Game Cards')
  }

  displayState(state: GameModel): void {
    this.displayCards(state.expended[1])
  }
}
