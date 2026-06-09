import 'phaser'
import { Color, Space, Style, Depth, Ease, Time } from '../../settings/settings'
import { MatchScene } from '../matchScene'
import Region from './baseRegion'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import avatarNames from '../../../../shared/data/avatarNames'
import GameModel from '../../../../shared/state/gameModel'
import { server } from '../../server'

export default class SearchingRegion extends Region {
  playerAvatar: Phaser.GameObjects.Image
  mysteryAvatar: Phaser.GameObjects.Image

  startTime: number
  txtTitle: Phaser.GameObjects.Text
  txtTime: Phaser.GameObjects.Text
  matchFound: boolean
  cancelButton: Button
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
  private lastDisplayedSecond: number = -1
  update(time, delta): void {
    // Keep the avatar size ratio right in case window resizes
    // TODO This should be in a on-resize callback
    this.fitHalfWidthAvatar(this.playerAvatar)
    this.fitHalfWidthAvatar(this.mysteryAvatar)

    // If a match has been found, stop counting
    if (this.matchFound) {
      return
    }

    this.sum += delta

    if (this.sum >= Time.general.searchingAvatarSwapIntervalMs) {
      this.sum = 0

      const i = Math.floor(Math.random() * 6)
      this.mysteryAvatar.setTexture(`avatar-${avatarNames[i]}Full`)
    }

    // Format the timer text
    if (this.startTime === undefined) {
      this.startTime = time
    }
    const elapsedSeconds = Math.floor((time - this.startTime) / 1000)
    if (elapsedSeconds !== this.lastDisplayedSecond) {
      this.lastDisplayedSecond = elapsedSeconds
      const seconds = elapsedSeconds % 60
      const minutes = Math.floor(elapsedSeconds / 60) % 60
      const hours = Math.floor(elapsedSeconds / 3600)
      const timeString =
        hours > 0
          ? `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
          : `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
      this.txtTime.setText(timeString)
    }
  }

  displayState(state: GameModel): void {
    this.matchFound = true

    // Once a match is found, prevent further cancel attempts
    if (this.cancelButton) {
      this.cancelButton.disable()
    }

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
      time: Time.general.searchingMatchFoundPulseMs,
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

  beforeExit(): void {
    if (this.matchFound) {
      return
    }

    server.send({
      type: 'cancelQueue',
      password: this.password,
    })
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
    this.mysteryAvatar = scene.add
      .image(0, 0, `avatar-${avatarNames[0]}Full`)
      .setTint(Color.grey)
      .setOrigin(0, 0.5)
    scene.plugins.get('rexAnchor')['add'](this.mysteryAvatar, {
      left: '0%',
      width: '50%',
      height: '100%',
    })
    this.fitHalfWidthAvatar(this.mysteryAvatar)

    this.playerAvatar = scene.add
      .image(0, 0, `avatar-${avatarNames[avatarId]}Full`)
      .setOrigin(1, 0.5)
    scene.plugins.get('rexAnchor')['add'](this.playerAvatar, {
      right: '0%',
      width: '50%',
      height: '100%',
    })
    this.fitHalfWidthAvatar(this.playerAvatar)

    this.container.add([this.mysteryAvatar, this.playerAvatar])
  }

  private fitHalfWidthAvatar(avatar: Phaser.GameObjects.Image): void {
    const source = this.scene.textures.get(avatar.texture.key).getSourceImage()
    const halfWidth = Space.windowWidth / 2
    const scaleW = halfWidth / source.width
    const scaleH = Space.windowHeight / source.height
    const scale = Math.max(scaleW, scaleH)
    avatar.setScale(scale)
  }

  private createText(scene: MatchScene): void {
    const textBlockHeight = 280
    const textBlockWidth = 580
    const textBackground = scene.add
      .rectangle(0, 5, textBlockWidth, textBlockHeight, Color.backgroundLight)
      .setOrigin(0.5, 0.5)
      .setAlpha(0.8)
    scene.addShadow(textBackground)
    this.container.add(textBackground)

    this.txtTitle = scene.add
      .text(0, -100, 'Searching for an opponent', Style.header)
      .setOrigin(0.5)

    // Password text
    if (this.password) {
      const txtPassword = scene.add
        .text(0, -50, `Password: ${this.password}`, Style.basic)
        .setStroke(Color.backgroundLightS, 2)
        .setOrigin(0.5)
      this.container.add(txtPassword)
    }

    // Time text
    this.txtTime = scene.add.text(0, 0, '', Style.header).setOrigin(0.5)

    this.container.add([this.txtTitle, this.txtTime])
  }

  private addButtons(scene: MatchScene): void {
    this.cancelButton = new Buttons.Basic({
      within: this.container,
      text: 'Cancel',
      y: 100,
      f: () => {
        scene.doBack()
      },
    })
  }
}
