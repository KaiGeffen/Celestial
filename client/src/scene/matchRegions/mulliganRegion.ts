import 'phaser'
import RoundRectangle from 'phaser3-rex-plugins/plugins/roundrectangle.js'

import Region from './baseRegion'
import CardLocation from './cardLocation'

import { Space, Color, Time, Style, Depth } from '../../settings/settings'
import Buttons from '../../lib/buttons/buttons'

import { CardImage } from '../../lib/cardImage'
import Card from '../../../../shared/state/card'
import GameModel from '../../../../shared/state/gameModel'
import { Animation } from '../../../../shared/animation'
import { Zone } from '../../../../shared/state/zone'
import { GameScene } from '../gameScene'
import { UserSettings } from '../../settings/userSettings'
import Button from '../../lib/buttons/button'
import { MechanicsSettings } from '../../../../shared/settings'

export default class MulliganRegion extends Region {
  // The cards in our starting hand
  cards: CardImage[] = []

  // Text saying who starts with priority
  txtPriority: Phaser.GameObjects.Text

  // The ready button
  btnReady: Button

  // The player's keep/not keep choices for each card in their hand
  mulliganChoices: [boolean, boolean, boolean] = [false, false, false]

  // The callback for when the button is clicked
  onButtonClick: () => void

  create(scene: GameScene): MulliganRegion {
    this.scene = scene

    this.cards = []
    this.mulliganChoices = [false, false, false]

    this.container = scene.add.container(0, 0).setDepth(Depth.mulligan)

    // Add the background
    this.container.add(this.createBackground(scene))

    let txtHint = scene.add
      .text(
        Space.windowWidth / 2,
        Space.windowHeight / 2 - Space.cardHeight / 2 - Space.pad / 2,
        'Click cards to replace',
        Style.basic,
      )
      .setOrigin(0.5, 1)
    let txtTitle = scene.add
      .text(
        Space.windowWidth / 2,
        txtHint.y - Space.pad / 2 - txtHint.height,
        'Starting Hand',
        Style.announcement,
      )
      .setOrigin(0.5, 1)

    this.txtPriority = scene.add
      .text(
        Space.windowWidth / 2,
        Space.windowHeight / 2 + Space.cardHeight / 2 + Space.pad * 2,
        '',
        Style.basic,
      )
      .setOrigin(0.5, 1)

    // Ready button
    const x = Space.windowWidth / 2
    const y = Space.windowHeight / 2 + Space.cardHeight / 2 + Space.pad * 4
    this.btnReady = new Buttons.Basic({
      within: this.container,
      text: 'Ready',
      x,
      y,
      f: () => {
        this.onButtonClick()
      },
      returnHotkey: true,
    })
    this.addHotkeyHint([x, y], 'SPACE')

    this.addHotkeyListeners()

    // Add each to the container
    this.container.add([txtTitle, txtHint, this.txtPriority])

    return this
  }

  displayState(state: GameModel): void {
    // If we are done with our mulligan, hide this
    if (state.mulligansComplete[0]) {
      this.hide()
      this.btnReady.disable()
      return
    }

    // Don't overwrite after the opponent has mulliganed
    if (state.mulligansComplete[1]) {
      return
    }

    this.show()

    // Show the cards as toggleable objects
    for (let i = 0; i < state.hand[0].length; i++) {
      const position = CardLocation.mulligan(this.container, i)
      let card = this.addCard(state.hand[0][i], position)
        .setCost(state.hand[0][i].cost)
        .setOnClick(this.onCardClick(i))
        .setFocusOptions('Toggle')

      this.cards.push(card)

      this.addHotkeyHint(position, `${i + 1}`)
    }

    // Update the text saying who starts with priority
    this.txtPriority.setText(
      `You will act ${state.priority === 0 ? 'first' : 'second'}`,
    )
  }

  setCallback(callback: () => void): void {
    this.onButtonClick = callback
  }

  private addHotkeyListeners() {
    // Add keyboard listeners
    const numberWords = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX']

    for (let i = 0; i < MechanicsSettings.HAND_CAP; i++) {
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

    this.scene.input.keyboard.on('keydown-SPACE', () => {
      if (this.btnReady.enabled && UserSettings._get('hotkeys')) {
        this.btnReady.onClick()
      }
    })
  }

  // The callback for when a card is clicked on
  private onCardClick(i: number): () => void {
    return () => {
      this.scene.playSound('click')

      this.mulliganChoices[i] = !this.mulliganChoices[i]

      this.cards[i].toggleSelectedForMulligan()
    }
  }

  private createBackground(scene: Phaser.Scene): Phaser.GameObjects.GameObject {
    const points = `0 ${Space.handHeight} 30 0 230 0 230 ${Space.handHeight}`
    let background = new RoundRectangle(
      scene,
      Space.windowWidth / 2,
      Space.windowHeight / 2,
      3 * Space.cardWidth + 4 * Space.pad,
      Space.cardHeight + 2 * Space.pad + 200,
      Space.corner,
      Color.backgroundDark,
    ).setInteractive()

    // Add a border around the shape TODO Make a class for this to keep it dry
    let postFxPlugin = scene.plugins.get('rexOutlinePipeline')
    postFxPlugin['add'](background, {
      thickness: 1,
      outlineColor: Color.border,
    })

    return background
  }
}
