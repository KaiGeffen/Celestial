import 'phaser'
import { Color, Space, Style, Depth, Ease, Time } from '../../settings/settings'
import { MatchScene } from '../matchScene'
import Region from './baseRegion'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import avatarNames from '../../data/avatarNames'
import GameModel from '../../../../shared/state/gameModel'
import { server } from '../../server'

export default class SearchingRegion extends Region {
  mysteryAvatar: Phaser.GameObjects.Image

  startTime: number
  txtTitle: Phaser.GameObjects.Text
  txtTime: Phaser.GameObjects.Text
  matchFound: boolean
  password: string

  create(scene: MatchScene, avatarId: number, password: string): Region {
    this.scene = scene
    this.password = password

    this.container = scene.add.container().setDepth(Depth.searching)
    this.scene.plugins.get('rexAnchor')['add'](this.container, {
      x: `50%`,
      y: `50%`,
    })

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
    const elapsedSeconds = (time - this.startTime) / 1000
    const seconds = Math.floor(elapsedSeconds) % 60
    const minutes = Math.floor(elapsedSeconds / 60) % 60
    const hours = Math.floor(elapsedSeconds / 3600)
    const timeString =
      hours > 0
        ? `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
        : `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
    this.txtTime.setText(timeString)
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

  // TODO This is a hack to force matchFound true when region hides, REFACTOR THIS REGION TO A SCENE
  hide(): Region {
    this.matchFound = true
    super.hide()

    return this
  }

  private createBackground(scene: Phaser.Scene): void {
    let background = scene.add
      .rectangle(0, 0, 1, 1, Color.backgroundLight)
      .setInteractive()

    this.scene.plugins.get('rexAnchor')['add'](background, {
      width: `100%`,
      height: `100%`,
    })

    this.container.add(background)
  }

  private createAvatars(scene: Phaser.Scene, avatarId: number): void {
    const scale = Math.min(1, Space.windowHeight / 600)
    let avatar = scene.add
      .image(-Space.windowWidth / 2, 0, `avatar-${avatarNames[avatarId]}Full`)
      .setScale(scale)
      .setOrigin(0, 0.5)

    this.mysteryAvatar = scene.add
      .image(Space.windowWidth / 2, 0, `avatar-${avatarNames[0]}Full`)
      .setScale(scale)
      .setTint(Color.grey)
      .setOrigin(1, 0.5)

    this.container.add([avatar, this.mysteryAvatar])
  }

  private createText(scene: Phaser.Scene): void {
    this.txtTitle = scene.add
      .text(0, -100, 'Searching for an opponent', Style.announcement)
      .setOrigin(0.5)

    // Password text
    if (this.password) {
      const txtPassword = scene.add
        .text(0, -50, `Password: ${this.password}`, Style.basic)
        .setOrigin(0.5)
      this.container.add(txtPassword)
    }

    // Time text
    this.txtTime = scene.add.text(0, 0, '', Style.announcement).setOrigin(0.5)

    this.container.add([this.txtTitle, this.txtTime])
  }

  private addButtons(scene: MatchScene): void {
    new Buttons.Basic({
      within: this.container,
      text: 'Cancel',
      y: 100,
      f: () => {
        server.send({
          type: 'cancelQueue',
          password: this.password,
        })
        scene.doBack()
      },
    })
  }
}

// Height of the tutorial text
const TEXT_HEIGHT = 225

// TODO Move to a separate file, it's a different region!

// A separate initial region seen during the tutorial
export class SearchingRegionTutorial extends Region {
  btn: Button
  img: Phaser.GameObjects.Image
  textbox: any
  background: Phaser.GameObjects.Rectangle

  // Number of the image frame currently shown, always end with the 3rd frame
  currentFrame: number

  create(scene: MatchScene, tutorialNum: number): Region {
    this.scene = scene
    this.container = scene.add.container().setDepth(Depth.searching)
    this.scene.plugins.get('rexAnchor')['add'](this.container, {
      x: `50%`,
      y: `50%`,
    })

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
      .image(0, 0, `tutorial-${tutorialNum === 0 ? 1 : 3}`)
      .setInteractive()

    // Ensure that image fits perfectly in window
    const scale = Space.windowWidth / this.img.displayWidth
    this.img.setScale(scale)

    this.container.add(this.img)

    this.tweenImage()
  }

  private createText(scene: MatchScene, tutorialNum: number): void {
    this.background = scene.add
      .rectangle(0, 0, 1, TEXT_HEIGHT, Color.backgroundLight)
      .setOrigin(0.5, 0)
      .setAlpha(0.8)
    scene.addShadow(this.background)

    scene.plugins.get('rexAnchor')['add'](this.background, {
      y: `50%-${TEXT_HEIGHT}`,
      width: `100%`,
    })

    // Create the dialog text
    const txt = scene.add
      .text(0, 0, '', Style.stillframe)
      .setWordWrapWidth(Space.stillframeTextWidth)

    const s = STORY_TEXT[tutorialNum][0]
    this.textbox = scene.rexUI.add
      .textBox({
        text: txt,
        space: {
          left: Space.pad,
          right: Space.pad,
          top: Space.pad,
          bottom: Space.pad,
        },
        page: {
          maxLines: 0, // 0 = unlimited lines
        },
      })
      .start(s, 50)
      .setOrigin(0)

    this.scene.plugins.get('rexAnchor')['add'](this.textbox, {
      x: `-50%+${Space.pad}`,
      y: `50%-${TEXT_HEIGHT}`,
    })

    this.container.add([this.background, txt, this.textbox])
  }

  private createButton(scene, tutorialNum): void {
    const container = scene.add.container()

    // NOTE 50% because it's in a 50% anchor already so it ends up at 100
    this.scene.plugins.get('rexAnchor')['add'](container, {
      x: `50%-${Space.pad + Space.buttonWidth / 2}`,
      y: `50%-${Space.pad + Space.buttonHeight / 2}`,
    })

    this.container.add(container)

    this.btn = new Buttons.Basic({
      within: container,
      text: 'Continue',
      f: () => {
        // If typing isn't complete, complete it
        if (this.textbox.isTyping) {
          this.textbox.stop(true)
        }
        // Otherwise move on to the next frame
        else if (this.currentFrame < STORY_TEXT[tutorialNum].length) {
          this.currentFrame += 1

          // NOTE This is a hack to get the first tutorial to have 2 text per image frame
          if ([3, 5].includes(this.currentFrame)) {
            // Change the background image
            this.img.setTexture(`tutorial-${(this.currentFrame + 1) / 2}`)

            this.tweenImage()
          }

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
    })
  }

  private tweenImage(): void {
    // Y of the image when flush with the bottom
    const downFully = Space.windowHeight * 1.5 - this.img.displayHeight

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
    `As your last breath leaves your lips, the soft sound of singing and sparkle of starlight stirs you.`,
    `Step after step, you walk a path marked by countless footprints, set in clouds high above the stars.`,
    `Finally, a great gate opens before you, and two figures with warm smiles step out to greet you.`,
    `"Traveler!" one figure calls out. "You've arrived at last!"`,
    `"Welcome to the City. What stories have you brought from your life to share with us?"`,
  ],

  [
    `"Marvelous! Traveler, please tell us more.
What have you seen out there in the world?"`,
  ],

  [
    `"So vibrant your tales, so vivid the dust of worlds you carry on your boots. One last story before we open the gate, and welcome you into the city."`,
  ],
]
