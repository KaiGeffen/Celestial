import 'phaser'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'

import { MatchScene } from './matchScene'
import data from '../data/tutorial.json'
import {
  Space,
  Color,
  BBStyle,
  Time,
  Depth,
  UserSettings,
} from '../settings/settings'
import Button from '../lib/buttons/button'
import Buttons from '../lib/buttons/buttons'
import { CardImage } from '../lib/cardImage'
import Catalog from '../../../shared/state/catalog'
import { ResultsRegionTutorial } from './matchRegions/matchResults'
import RoundResultRegion from './matchRegions/roundResultRegion'
import { Animation } from '../../../shared/animation'
import { Zone } from '../../../shared/state/zone'
import GameModel from '../../../shared/state/gameModel'
import Loader from '../loader/loader'

/** Hint text starts this many px left of its laid-out position and slides in with the fade. */
const HINT_TWEEN_X_DELTA = -10

export default class TutorialMatchScene extends MatchScene {
  // How far into the tutorial (How many lines of text you have seen)
  progress: number

  // The primary text object
  txt: RexUIPlugin.BBCodeText

  // Text button to continue the hint text
  btnNext: Button

  // A card that is being shown
  card: CardImage

  isTutorial = true

  constructor(args = { key: 'TutorialMatchScene', lastScene: 'JourneyScene' }) {
    super(args)
  }

  init(...args: Parameters<MatchScene['init']>): void {
    super.init(...args)
    const params = args[0]
    this.applyTutorialMissionInitialRegions(params.missionID ?? 0)
  }

  /** Regions hidden at tutorial start depend on which mission is running. */
  private applyTutorialMissionInitialRegions(missionID: number): void {
    this.view.searching.hide()
    this.view.mulligan.hide()

    switch (missionID) {
      case 0:
        this.view.pass.tutorialSimplifyPass(true)
        this.view.pass.hide()
        this.view.ourAvatar.hide()
        this.view.theirAvatar.hide()
        this.view.theirBoard.hide()
        this.view.ourStacks.hide()
        this.view.theirStacks.hide()
        this.view.historyRegion.hide()
        this.view.ourBoard.tutorialSetHandVisibility(false)
        break

      case 1:
        this.view.pass.tutorialSimplifyPass(true)
        this.view.ourStacks.hide()
        this.view.theirStacks.hide()
        this.view.historyRegion.hide()
        break

      case 2:
        break

      default:
        break
    }
  }

  preload(): void {
    Loader.loadTutorialCutscenes(this)
  }

  create(): void {
    super.create()

    // Replace the results screen with tutorial results
    this.view.results = new ResultsRegionTutorial().create(this)
    this.view.results['missionID'] = this.params.missionID + 1

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
      .setOrigin(0.5, 1)
      .setDepth(Depth.tutorial)
      .setInteractive()

    // Add a background and outline
    this.txt
      .setBackgroundColor(Color.backgroundLight)
      .setBackgroundCornerRadius(Space.corner)
      .setPadding(Space.padSmall, Space.padSmall)

    // Next button for tutorial text
    this.btnNext = new Buttons.Basic({
      within: this,
      text: 'Next',
      f: () => {
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
      },
      returnHotkey: true,
    })
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

    // If player has won/lost, ensure pass button is enabled, and set the tutorial as completed
    if (state.winner !== null) {
      this.view.pass.tutorialSimplifyPass(false)
      UserSettings._setIndex('completedMissions', this.params.missionID, true)
    }

    let result = super.displayState(state)

    if (!result) {
      return false
    }

    // Don't progress hints during the recap
    if (!state.isRecap) {
      this.progress += 1
    }

    // Preserve any pause the parent set (e.g. end-of-round recap pause)
    const parentPaused = this.paused

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

    // At the end of the night, show a hint after the round result animation finishes
    if (parentPaused) {
      this.paused = true
      const round = state.roundCount - 1
      const mission = this.params.missionID
      ;(this.view.scores as RoundResultRegion).onAnimationComplete = () => {
        this.displayNightHint(mission, round)
      }
    }

    return result
  }

  // Display a night hint (end-of-round pause) for the given mission and round
  private displayNightHint(mission: number, round: number): void {
    const datum = data[mission].night[round]
    if (!datum) return

    const s = `[b]${datum.bold}[/b]`
    this.txt.setAlpha(0)
    this.txt.setText(s).setVisible(true)

    this.align(datum)

    this.playHintEntranceTween()
  }

  // Display the current hint for the given mission id
  private displayHint(i: number): void {
    const datum = data[i].hints[this.progress]

    if (datum === undefined || datum === null) {
      // Hide all elements
      this.txt.setVisible(false)
      this.btnNext.setVisible(false)

      // Ensure that scene is not paused
      this.paused = false

      return
    }

    // Set the appropriate text
    const s = `[b]${datum.bold}[/b]`

    this.txt.setAlpha(0)
    this.txt.setText(s).setVisible(s !== '')

    // If this is the final hint before the player must do something, hide the button
    this.btnNext.setVisible(!datum.final)

    // Align the elements based on the type of hint
    this.align(datum)

    if (s !== '') {
      this.playHintEntranceTween()
    }

    // If next button is visible, pause match until it's clicked
    this.paused = this.btnNext.isVisible()
  }

  /** After `align`, slide from `HINT_TWEEN_X_DELTA` and fade in in one tween. */
  private playHintEntranceTween(): void {
    const endX = this.txt.x
    this.txt.x = endX + HINT_TWEEN_X_DELTA
    this.tweens.add({
      targets: this.txt,
      x: endX,
      alpha: 1,
      duration: Time.match.hintFade,
    })
  }

  // Display hints for the first tutorial
  private displayHints1(): void {
    this.displayHint(0)

    // Have glows only for the first two hints
    this.view.wins.stopTutorialGlow()
    this.view.breathRegion.stopTutorialGlow()

    if (this.progress === 0) {
      this.view.wins.startTutorialGlow()
    } else if (this.progress === 1) {
      this.view.breathRegion.startTutorialGlow()
    }

    // Hide different elements on the screen based on progress
    switch (this.progress) {
      case 1:
        break

      case 2:
        this.addCard('Dove')
        break

      case 4:
        this.addCard('Dash')
        break

      case 5:
        this.addCard('Mercy')
        break

      case 6:
        this.card.destroy()
        this.view.ourBoard.tutorialSetHandVisibility(true)
        break

      case 7:
        this.view.theirBoard.show()

        // User can't pass during first tutorial
        this.view.pass.show()
        this.view.pass.tutorialSimplifyPass(true)

        break
    }
  }

  // Display hints for the second tutorial
  private displayHints2(): void {
    this.displayHint(1)

    if (this.progress === 7) {
      this.view.pass.tutorialSimplifyPass(false)
    }

    // Hide different elements on the screen based on progress
    switch (this.progress) {
      case 6:
        this.view.ourBoard.cards[1].setOnClick(() => {
          this.signalError('Try playing Mercy then passing...')
        })
        break

      case 8:
      case 10:
        this.view.ourBoard.cards[0].setOnClick(() => {
          this.signalError('Try passing instead...')
        })
        break
    }
  }

  // Display hints for the third tutorial
  private displayHints3(): void {
    this.displayHint(2)
  }

  // Align the elements based on the type of tutorial
  private align(datum): void {
    // Fixed anchor: text bottom and button are always at the same Y
    const textBottomY = Space.windowHeight / 2 + Space.pad * 4
    const btnY = textBottomY + Space.pad + Space.buttonHeight / 2

    let textX = Space.windowWidth / 2
    let btnX = Space.windowWidth / 2

    switch (datum.align) {
      case 'right':
        textX = Space.windowWidth - this.txt.displayWidth / 2 - Space.pad
        btnX = textX
        break

      case 'left':
        textX = this.txt.displayWidth / 2 + Space.pad
        btnX = textX
        break

      case 'card':
        textX =
          Space.windowWidth / 2 +
          Space.cardWidth / 2 +
          Space.pad +
          this.txt.displayWidth / 2
        btnX =
          textX - this.txt.displayWidth / 2 + Space.buttonWidth / 2 + Space.pad
        break

      case 'bottom':
      case 'center':
        break

      case 'story':
        textX = Space.windowWidth / 2 + this.txt.displayWidth / 2 + Space.pad
        btnX = textX
        break
    }

    this.txt.setPosition(textX, textBottomY)
    this.btnNext.setPosition(btnX, btnY)
  }

  private addCard(name: string): CardImage {
    if (this.card !== undefined) {
      this.card.destroy()
    }

    const x = Space.windowWidth / 2
    const y = Space.windowHeight / 2
    this.card = new CardImage(Catalog.getCard(name), this.add.container(x, y))

    return this.card
  }

  doExit(): () => void {
    return () => {
      this.beforeExit()
      this.scene.start('SigninScene')
    }
  }
}
