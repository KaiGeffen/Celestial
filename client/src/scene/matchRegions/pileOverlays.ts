import 'phaser'
import Card from '../../lib/card'
import { CardImage } from '../../lib/cardImage'
import GameModel from '../../../../shared/state/gameModel'
import { Color, Depth, Space, Style } from '../../settings/settings'
import BaseScene from '../baseScene'
import Region from './baseRegion'
import CardLocation from './cardLocation'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'

export default class OverlayRegion extends Region {
  txtTitle: Phaser.GameObjects.Text

  // fSwitch is the callback for if this overlay switches to another overlay
  create(scene: BaseScene, title: string): OverlayRegion {
    this.scene = scene

    this.container = scene.add
      .container()
      .setDepth(Depth.pileOverlays)
      .setVisible(false)

    // Create the background
    let background = scene.add
      .rectangle(0, 0, Space.windowWidth, Space.windowHeight, Color.darken, 0.8)
      .setOrigin(0)
      .setInteractive()
      .on('pointerdown', () => {
        this.container.setVisible(false)
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

  displayState(state: GameModel, isRecap: boolean): void {}

  // Set the callback for this overlay switching to another
  setSwitch(callback: () => void): this {
    new Buttons.Basic(
      this.container,
      Space.pad + Space.buttonWidth / 2,
      Space.pad + Space.buttonHeight / 2,
      'Other',
      callback,
    )

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
  create(scene: BaseScene): OverlayRegion {
    return super.create(scene, 'Your Deck')
  }

  displayState(state: GameModel, isRecap: boolean): void {
    this.displayCards(state.deck[0])
  }
}

export class TheirDeckOverlay extends OverlayRegion {
  create(scene: BaseScene): OverlayRegion {
    return super.create(scene, 'Their Last Shuffle')
  }

  displayState(state: GameModel, isRecap: boolean): void {
    this.displayCards(state.last_shuffle[1])
  }
}

export class OurDiscardOverlay extends OverlayRegion {
  create(scene: BaseScene): OverlayRegion {
    super.create(scene, 'Your Discard Pile')

    return this
  }

  displayState(state: GameModel, isRecap: boolean): void {
    this.displayCards(state.discard[0])
  }
}

export class TheirDiscardOverlay extends OverlayRegion {
  create(scene: BaseScene): OverlayRegion {
    return super.create(scene, 'Their Discard Pile')
  }

  displayState(state: GameModel, isRecap: boolean): void {
    this.displayCards(state.discard[1])
  }
}

export class OurExpendedOverlay extends OverlayRegion {
  create(scene: BaseScene): OverlayRegion {
    super.create(scene, 'Your Removed From Game Cards')

    return this
  }

  displayState(state: GameModel, isRecap: boolean): void {
    this.displayCards(state.expended[0])
  }
}

export class TheirExpendedOverlay extends OverlayRegion {
  create(scene: BaseScene): OverlayRegion {
    return super.create(scene, 'Their Removed From Game Cards')
  }

  displayState(state: GameModel, isRecap: boolean): void {
    this.displayCards(state.expended[1])
  }
}
