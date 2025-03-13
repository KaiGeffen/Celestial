import 'phaser'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'

import { AdventureGameScene } from './gameScene'
import data from '../catalog/tutorial.json'
import { Space, Color, BBStyle, Time, Depth, Flags } from '../settings/settings'
import Button from '../lib/buttons/button'
import Buttons from '../lib/buttons/buttons'
import { TutorialCardImage } from '../lib/cardImage'
import Catalog from '../../../shared/state/catalog'
import { ResultsRegionTutorial } from './matchRegions/results'
import { SearchingRegionTutorial } from './matchRegions/searching'
import { Animation } from '../../../shared/animation'
import { Zone } from '../../../shared/state/zone'
import GameModel from '../../../shared/state/gameModel'

export default class TutorialGameScene extends AdventureGameScene {
  // How far into the tutorial (How many lines of text you have seen)
  progress: number

  // The primary text object
  txt: RexUIPlugin.BBCodeText

  // Text button to continue the hint text
  btnNext: Button

  // Pointer for showing area of interest to user
  pointer: Phaser.GameObjects.Image

  // A card that is being shown
  card: TutorialCardImage

  isTutorial = true

  constructor(
    args = { key: 'TutorialGameScene', lastScene: 'AdventureScene' },
  ) {
    super(args)
  }

  create(): void {
    super.create()

    // Replace the results screen with tutorial results
    this.view.results = new ResultsRegionTutorial().create(this)
    this.view.results['missionID'] = this.params.missionID + 1
    this.view.results.hide()

    // Replace the searching screen with still frames
    this.view.searching.hide()
    this.view.searching = new SearchingRegionTutorial().create(
      this,
      this.params.missionID,
    )

    // Must reset progress
    this.progress = -1

    // Hint text
    this.txt = this.rexUI.add
      .BBCodeText(
        Space.windowWidth / 2,
        Space.windowHeight / 2,
        '',
        BBStyle.basic,
      )
      .setOrigin(0.5, Flags.mobile ? 0 : 0.5)
      .setDepth(Depth.tutorial)

    // Add a background and outline
    this.txt
      .setBackgroundColor(Color.backgroundLight)
      .setBackgroundCornerRadius(Space.corner)
      .setPadding(Space.padSmall, Space.padSmall)

    // Next button for tutorial text
    this.btnNext = new Buttons.Basic(this, 0, 0, 'Next', () => {
      this.progress += 1
      switch (this.params.missionID) {
        case 0:
          this.displayHints1()
          break
        case 1:
          this.displayHints2()
          break
        case 2:
          this.displayHints3()
          break
      }
    })

    // Pointer for showing area of interest to user
    this.pointer = this.add
      .image(0, 0, 'icon-Pointer')
      .setAlpha(Flags.mobile ? 0.0001 : 1)
  }

  protected displayState(state: GameModel): boolean {
    // Remove unused animations
    for (let i = 0; i < 2; i++) {
      state.animations[i] = state.animations[i].filter(
        (animation: Animation) => {
          // Filter out shuffle and mulligan animations
          if (
            animation.to === Zone.Shuffle ||
            animation.from === Zone.Shuffle
          ) {
            return false
          }
          if (
            animation.to === Zone.Mulligan ||
            animation.from === Zone.Mulligan
          ) {
            return false
          }

          return true
        },
      )
    }

    // If player has won/lost, ensure pass button is enabled
    if (state.winner !== null) {
      this.view.pass['enablePass']()
    }

    let result = super.displayState(state)

    if (!result) {
      return false
    }

    // Don't progress hints during the recap
    if (!state.isRecap) {
      this.progress += 1
    }

    switch (this.params.missionID) {
      case 0:
        this.view.commands.hide()
        this.displayHints1()
        break

      case 1:
        this.displayHints2()
        break

      case 2:
        this.displayHints3()
        break
    }

    return result
  }

  // Display the current hint for the given mission id
  private displayHint(i: number): void {
    const datum = data[i][this.progress]

    if (datum === undefined || datum === null) {
      // Hide all elements
      this.txt.setVisible(false)
      this.btnNext.setVisible(false)
      this.pointer.setVisible(false)

      // Ensure that scene is not paused
      this.paused = false

      return
    }

    // Set the appropriate text
    let s = `[i]${datum.italic}[/i]`
    if (datum.italic) s += '\n\n'
    if (Flags.mobile && datum.mobile) s += `[b]${datum.mobile}[/b]`
    else s += `[b]${datum.bold}[/b]`

    this.txt.setText(s).setVisible(s !== '')

    // Fade that text in
    this.tweens.add({
      targets: this.txt,
      alpha: 1,
      duration: Time.hintFade(),
      onStart: () => {
        this.txt.alpha = 0
      },
    })

    // If this is the final hint before the player must do something, hide the button
    this.btnNext.setVisible(!datum.final)
    this.pointer.setVisible(!datum.final)

    // Align the elements based on the type of hint
    this.align(datum)

    // If next button is visible, pause match until it's clicked
    this.paused = this.btnNext.isVisible()
  }

  // Display hints for the first tutorial
  private displayHints1(): void {
    this.displayHint(0)

    // Hide different elements on the screen based on progress
    switch (this.progress) {
      case 0:
        this.view.pass.hide()
        this.view.theirAvatar.hide()
        this.view.ourHand.hide()
        this.view.ourScore.hideAll().showWins()
        if (!Flags.mobile) {
          this.view.ourScore.showBackground()
        }
        break

      case 1:
        this.view.ourScore.showBreath()
        break

      case 2:
        this.addCardWithRequiredHover('Dove')
        break

      case 4:
        this.addCard('Dash')
        break

      case 5:
        this.addCard('Mercy')
        break

      case 6:
        this.card.destroy()
        this.view.ourHand.show()['hideStacks']()
        break

      case 7:
        this.view.theirAvatar.show()['hideStacks']()

        this.view.pass.show()['disablePass']()
        break
    }
  }

  // Display hints for the second tutorial
  private displayHints2(): void {
    this.displayHint(1)

    // Hide stacks
    this.view.commands.hide()
    this.view.ourHand['hideStacks']()
    this.view.theirAvatar['hideStacks']()

    // Hide pass until a point
    if (this.progress === 0) {
      this.view.pass['disablePass']()
    } else if (this.progress === 7) {
      this.view.pass['enablePass']()
    }

    // Hide different elements on the screen based on progress
    switch (this.progress) {
      case 5:
        this.view.ourHand.cards[1].setOnClick(() => {
          this.signalError('Try playing Mercy then passing...')
        })
        break

      case 7:
      case 9:
        this.view.ourHand.cards[0].setOnClick(() => {
          this.signalError('Try passing instead...')
        })
        break
    }
  }

  // Display hints for the third tutorial
  private displayHints3(): void {
    this.displayHint(2)

    // Hide stacks
    // this.view.discardPiles.hide()
    this.view.commands.hide()
    // this.view.ourHand['hideStacks']()

    // // Hide pass until a point
    // if (this.progress < 8) {
    // 	this.view.pass.hide()
    // } else {
    // 	this.view.pass.show()
    // }
  }

  // Align the elements based on the type of tutorial
  private align(datum): void {
    // Reset flipping the pointer
    this.pointer.resetFlip()

    // On mobile, text always in top left
    if (Flags.mobile) {
      const x = Space.windowWidth / 2
      this.txt.setPosition(x, Space.pad)

      // Button just below text
      const y = this.txt.displayHeight + Space.pad * 2 + Space.buttonHeight / 2
      this.btnNext.setPosition(x, y)
      return
    }

    let x, y
    switch (datum.align) {
      case 'right':
        this.pointer.setRotation(0)

        x = Space.windowWidth - Space.pad - this.pointer.width / 2 - 80
        y = Space.windowHeight - Space.handHeight - this.pointer.height + 30
        this.pointer.setPosition(x, y)

        // Text to the left of pointer
        x -= this.pointer.width / 2 + Space.pad + this.txt.displayWidth / 2
        y -= this.pointer.height / 2
        this.txt.setPosition(x, y)

        // Move next button just below the text
        y += this.txt.displayHeight / 2 + Space.pad + Space.buttonHeight / 2
        this.btnNext.setPosition(x, y)
        break

      case 'left':
        this.pointer.setRotation(0).setFlipX(true)

        x = Space.pad + this.pointer.width / 2 + 80
        y = Space.windowHeight - Space.handHeight - this.pointer.height + 30
        this.pointer.setPosition(x, y)

        // Text to the right of pointer
        x += this.pointer.width / 2 + Space.pad + this.txt.displayWidth / 2
        y -= this.pointer.height / 2
        this.txt.setPosition(x, y)

        // Move next button just below the text
        y += this.txt.displayHeight / 2 + Space.pad + Space.buttonHeight / 2
        this.btnNext.setPosition(x, y)
        break

      case 'card':
        this.pointer.setRotation(Math.PI / 2)

        x =
          Space.windowWidth / 2 +
          Space.cardWidth / 2 +
          Space.pad +
          this.pointer.width / 2 +
          50
        y = Space.windowHeight / 2 + this.pointer.height / 2
        this.pointer.setPosition(x, y)

        // Text above the pointer
        x =
          Space.windowWidth / 2 +
          Space.cardWidth / 2 +
          Space.pad +
          this.txt.displayWidth / 2
        y -= this.pointer.height / 2 + Space.pad + this.txt.displayHeight / 2
        this.txt.setPosition(x, y)

        // Move next button below and to the left of
        x -= this.txt.displayWidth / 2 - Space.buttonWidth / 2 - Space.pad
        y += this.txt.displayHeight / 2 + Space.pad + Space.buttonHeight / 2
        this.btnNext.setPosition(x, y)
        break

      case 'bottom':
        this.pointer.setRotation(0).setFlipX(true)

        x = Space.windowWidth / 2 - Space.cardWidth
        y =
          Space.windowHeight -
          Space.handHeight -
          this.pointer.displayHeight / 2 -
          Space.pad * 2
        this.pointer.setPosition(x, y)

        // Text left of the pointer
        // NOTE Get right instead of left because x is flipped
        x =
          this.pointer.getRightCenter().x +
          this.txt.displayWidth / 2 +
          Space.pad
        y -= this.pointer.displayHeight / 2
        this.txt.setPosition(x, y)

        // Button just below text
        y += this.txt.displayHeight / 2 + Space.pad + Space.buttonHeight / 2
        this.btnNext.setPosition(x, y)

        break

      case 'center':
        this.pointer.setVisible(false)

        x = Space.windowWidth / 2
        y = Space.windowHeight / 2
        this.txt.setPosition(x, y)

        // Button just below text
        y += this.txt.displayHeight / 2 + Space.pad + Space.buttonHeight / 2
        this.btnNext.setPosition(x, y)

        break

      case 'story':
        this.pointer.setVisible(false)

        // Text to the right of center
        x = Space.windowWidth / 2 + this.txt.displayWidth / 2 + Space.pad
        y = Space.windowHeight / 2
        this.txt.setPosition(x, y)

        // Button just below text
        y += this.txt.displayHeight / 2 + Space.pad + Space.buttonHeight / 2
        this.btnNext.setPosition(x, y)

        break
    }
  }

  private addCard(name: string): TutorialCardImage {
    if (this.card !== undefined) {
      this.card.destroy()
    }

    const x = Flags.mobile ? Space.cardWidth / 2 : Space.windowWidth / 2
    const y = Flags.mobile
      ? Space.windowHeight - Space.cardHeight / 2
      : Space.windowHeight / 2
    this.card = new TutorialCardImage(
      Catalog.getCard(name),
      this.add.container(x, y),
    )

    return this.card
  }

  // Add a card that must have each hoverable component hovered before continuing
  private addCardWithRequiredHover(name: string): void {
    let card = this.addCard(name)

    // TODO On mobile possibly force some other interaction
    if (Flags.mobile) {
      return
    }

    // Disable the next button until each component has been hovered
    this.btnNext.disable()

    card.highlightComponents(() => this.btnNext.enable())
  }
}
