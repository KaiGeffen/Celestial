import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { Color, Space, Style, Depth, Ease, Time } from '../../settings/settings'
import { MatchScene } from '../matchScene'
import Region from './baseRegion'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import avatarNames from '../../../../shared/data/avatarNames'
import GameModel from '../../../../shared/state/gameModel'
import { server } from '../../server'
import {
  notifyMatchFound,
  requestMatchNotificationPermission,
  shouldShowNotificationRequestButton,
} from '../../utils/notifications'

// Matches found faster than this (e.g. pve is roughly immediate) skip the
// found fanfare (flash tween + browser notification)
const MATCH_FOUND_FANFARE_MIN_SEARCH_MS = 1000

export default class SearchingRegion extends Region {
  playerAvatar: Phaser.GameObjects.Image
  mysteryAvatar: Phaser.GameObjects.Image

  startTime: number
  txtTitle: Phaser.GameObjects.Text
  txtTime: Phaser.GameObjects.Text
  matchFound: boolean
  cancelButton: Button
  notifyButton: Button
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

    // A near-instant match found skips the fanfare entirely
    const searchDuration =
      this.startTime === undefined ? 0 : this.scene.time.now - this.startTime
    if (searchDuration < MATCH_FOUND_FANFARE_MIN_SEARCH_MS) {
      this.hide()
      return
    }

    // Send an os notification
    notifyMatchFound()

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
    const sizer = scene.rexUI.add.sizer({
      orientation: 'horizontal',
      y: 100,
      space: {
        item: Space.pad,
      },
    })

    this.cancelButton = this.addSizerButton(scene, sizer, 'Cancel', () => {
      scene.doBack()
    })

    // Show notification button if valid
    if (shouldShowNotificationRequestButton()) {
      this.notifyButton = this.addSizerButton(scene, sizer, 'Notify', () => {
        requestMatchNotificationPermission().then((permission) => {
          if (permission === 'granted') {
            this.notifyButton.setText('Allowed').disable()
          } else if (permission === 'denied') {
            this.notifyButton.setText('Denied').disable()
          }
        })
      })
    }

    sizer.layout()
    this.container.add(sizer)
  }

  /** Wrap a Basic button in a ContainerLite so the sizer can lay it out. */
  private addSizerButton(
    scene: MatchScene,
    sizer: any,
    text: string,
    f: () => void,
  ): Button {
    const container = new ContainerLite(
      scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    const button = new Buttons.Basic({ within: container, text, f })
    sizer.add(container)
    return button
  }
}
