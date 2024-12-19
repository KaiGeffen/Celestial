import 'phaser'
import { Color, Space, Style, Depth, Ease, Time } from '../../settings/settings'
import BaseScene from '../baseScene'
import Region from './baseRegion'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import avatarNames from '../../lib/avatarNames'
import GameModel from '../../../../shared/state/gameModel'

export default class SearchingRegion extends Region {
  mysteryAvatar: Phaser.GameObjects.Image

  startTime: number
  txtTitle: Phaser.GameObjects.Text
  txtTime: Phaser.GameObjects.Text
  matchFound: boolean

  create(scene: BaseScene, avatarId: number): Region {
    this.scene = scene
    this.container = scene.add.container(0, 0).setDepth(Depth.searching)

    this.createBackground(scene)

    this.createAvatars(scene, avatarId)

    this.createText(scene)

    this.addButtons(scene)

    return this
  }

  sum = 0
  update(time, delta): void {
    // If a match has been found, stop counting
    if (this.matchFound) {
      return
    }

    this.sum += delta

    if (this.sum >= Time.avatarSwap) {
      this.sum = 0

      const i = Math.floor(Math.random() * 6)
      this.mysteryAvatar.setTexture(`avatar-${avatarNames[i]}Full`)
    }

    // Format the timer text
    if (this.startTime === undefined) {
      this.startTime = time
    }

    const seconds = Math.floor((time - this.startTime) / 1000) % 60
    const minutes = Math.floor(seconds / 60)
    this.txtTime.setText(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`)
  }

  displayState(state: GameModel): void {
    this.matchFound = true

    // If player has been waiting trivial time, don't bother
    if (parseInt(this.txtTime.text.replace(':', '')) <= 3) {
      this.hide()
      return
    }

    // Change the text and have it flash, then hide this region
    this.txtTitle.setText('Opponent found')
    this.scene.playSound('match found')
    // this.mysteryAvatar.setTexture(`avatar-${avatarNames[state.avatars[1]]}Full`)

    this.scene.tweens.add({
      targets: this.txtTitle,
      alpha: 0,
      time: Time.searchFlash,
      yoyo: true,
      onComplete: () => {
        this.hide()
      },
    })
  }

  private createBackground(scene: Phaser.Scene): void {
    let background = scene.add
      .rectangle(
        0,
        0,
        Space.windowWidth,
        Space.windowHeight,
        Color.backgroundLight,
      )
      .setOrigin(0)

    this.container.add(background)
  }

  private createAvatars(scene: Phaser.Scene, avatarId: number): void {
    const scale = Math.min(1, Space.windowHeight / 600)
    let avatar = scene.add
      .image(0, Space.windowHeight / 2, `avatar-${avatarNames[avatarId]}Full`)
      .setScale(scale)
      .setOrigin(0, 0.5)

    this.mysteryAvatar = scene.add
      .image(
        Space.windowWidth,
        Space.windowHeight / 2,
        `avatar-${avatarNames[0]}Full`,
      )
      .setScale(scale)
      .setOrigin(1, 0.5)
      .setTint(Color.grey)

    this.container.add([avatar, this.mysteryAvatar])
  }

  private createText(scene: Phaser.Scene): void {
    this.txtTitle = scene.add
      .text(
        Space.windowWidth / 2,
        Space.windowHeight / 2 - 100,
        'Searching for an opponent',
        Style.announcement,
      )
      .setOrigin(0.5)

    // Time text
    this.txtTime = scene.add
      .text(
        Space.windowWidth / 2,
        Space.windowHeight / 2,
        '',
        Style.announcement,
      )
      .setOrigin(0.5)

    // Background for text
    const width = Space.windowWidth - 2 * this.mysteryAvatar.width
    const height = Space.windowHeight // this.mysteryAvatar.height

    this.container.add([this.txtTitle, this.txtTime])
  }

  private addButtons(scene: BaseScene): void {
    let btn = new Buttons.Basic(
      this.container,
      Space.windowWidth / 2,
      Space.windowHeight / 2 + 100,
      'Cancel',
      () => {
        // Do any necessary cleanup
        scene.beforeExit()

        // Return to the last scene
        scene.doBack()
      },
    )
  }
}

// Height of the tutorial text
const TEXT_HEIGHT = 225

// A separate initial region seen during the tutorial
export class SearchingRegionTutorial extends Region {
  btn: Button
  img: Phaser.GameObjects.Image
  textbox: any
  background: Phaser.GameObjects.Rectangle

  // Number of the image frame currently shown, always end with the 3rd frame
  currentFrame: number

  create(scene: BaseScene, tutorialNum: number): Region {
    this.scene = scene
    this.container = scene.add.container(0, 0).setDepth(Depth.searching)

    // For the first tutorial, show first 3 frames
    this.currentFrame = tutorialNum === 0 ? 1 : 3

    this.createImage(scene, tutorialNum)

    this.createText(scene, tutorialNum)

    this.createButton(scene, tutorialNum)

    // Pause until button is pressed
    scene['paused'] = true

    return this
  }

  displayState(state: GameModel): void {
    this.hide()
  }

  private createImage(scene: Phaser.Scene, tutorialNum: number): void {
    this.img = scene.add
      .image(
        Space.windowWidth / 2,
        0,
        `story-Story ${tutorialNum === 0 ? 1 : 3}`,
      )
      .setOrigin(0.5, 0)
      .setInteractive()

    // Ensure that image fits perfectly in window
    const scale = Space.windowWidth / this.img.displayWidth
    this.img.setScale(scale)

    this.container.add(this.img)

    this.tweenImage()
  }

  private createText(scene: BaseScene, tutorialNum: number): void {
    this.background = scene.add
      .rectangle(
        0,
        Space.windowHeight - TEXT_HEIGHT,
        Space.windowWidth,
        TEXT_HEIGHT,
        Color.backgroundLight,
      )
      .setOrigin(0)
      .setAlpha(0.8)
    scene.plugins.get('rexDropShadowPipeline')['add'](this.background, {
      distance: 3,
      shadowColor: 0x000000,
    })

    let txt = scene.add
      .text(0, 0, '', Style.stillframe)
      .setWordWrapWidth(Space.stillframeTextWidth)

    const s = STORY_TEXT[tutorialNum][0]
    this.textbox = scene.rexUI.add
      .textBox({
        text: txt,
        x: Space.pad,
        y: this.background.y,
        space: {
          left: Space.pad,
          right: Space.pad,
          top: Space.pad,
          bottom: Space.pad,
        },
      })
      .start(s, 50)
      .setOrigin(0)

    this.container.add([this.background, txt, this.textbox])
  }

  private createButton(scene, tutorialNum): void {
    this.btn = new Buttons.Basic(
      this.container,
      Space.windowWidth - Space.pad - Space.buttonWidth / 2,
      Space.windowHeight - Space.pad - Space.buttonHeight / 2,
      'Continue',
      () => {
        // If typing isn't complete, complete it
        if (this.textbox.isTyping) {
          this.textbox.stop(true)
        }
        // Otherwise move on to the next frame
        else if (this.currentFrame < 3) {
          this.currentFrame += 1

          // Change the background image
          this.img.setTexture(`story-Story ${this.currentFrame}`)

          this.tweenImage()

          // Change the text
          const s = STORY_TEXT[tutorialNum][this.currentFrame - 1]
          this.textbox.start(s, 50)
        }
        // Otherwise hide the stillframe contents and transition away the image
        else {
          this.textbox.setVisible(false)
          this.background.setVisible(false)

          this.btn.destroy()

          // Tween the stillframe scrolling up to be flush with the top, then start the match
          this.scene.add.tween({
            targets: this.img,
            duration: Time.stillframeScroll,
            ease: Ease.stillframeEnd,
            y: 0,
            onComplete: () => {
              scene['paused'] = false
            },
          })
        }
      },
    )
  }

  private tweenImage(): void {
    // Y of the image when flush with the bottom
    const downFully = Space.windowHeight - this.img.displayHeight

    // First end any tweens that are playing (Previous stillframes)
    this.scene.tweens.getTweens().forEach((tween) => {
      tween.complete()
    })

    if (this.currentFrame < 3) {
      // Scroll the image going down
      this.scene.add.tween({
        targets: this.img,
        duration: 6000,
        ease: Ease.stillframe,
        y: downFully,
        onStart: () => {
          this.img.y = 0
        },
      })
    } else {
      // If this is the 3rd frame, animate going up slightly
      // Scroll the image going down
      this.scene.add.tween({
        targets: this.img,
        duration: (6000 * 1) / 3,
        ease: Ease.stillframe,
        y: (downFully * 2) / 3,
        onStart: () => {
          this.img.y = downFully
        },
      })
    }
  }
}

const STORY_TEXT = [
  [
    `We called out to the people of the world.
In desperation, curiosity, and humor.
Come to our city, teach us what you've learned.`,

    `One by one they arrived, guided by stars, and were greeted with excitement at the gate.`,

    `"Traveler!
Welcome to the city, we're glad you made it.
What stories have you brought to tell us?"`,
  ],

  [
    `"Marvelous! Traveler, please tell us more.
What have you seen out there in the world?"`,
  ],

  [
    `"So vibrant your tales, so vivid the dust of worlds you carry on your boots. One last story before we open the gate, and welcome you into the city."`,
  ],
]
