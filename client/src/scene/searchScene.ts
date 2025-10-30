import 'phaser'
import BaseScene from './baseScene'
import { Color, Space, Style, Ease, Time } from '../settings/settings'
import avatarNames from '../data/avatarNames'
import Buttons from '../lib/buttons/buttons'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

export default class SearchScene extends BaseScene {
  private mysteryAvatar: Phaser.GameObjects.Image
  private startTime: number
  private txtTitle: Phaser.GameObjects.Text
  private txtTime: Phaser.GameObjects.Text
  private matchFound: boolean
  private sum: number = 0

  init(params: { avatarId?: number } = {}) {
    this.data.set('avatarId', params.avatarId ?? 0)
  }

  create() {
    const avatarId = this.data.get('avatarId') ?? 0

    this.createBackground()
    this.createAvatars(avatarId)
    this.createText()
    this.addButtons()
  }

  update(time: number, delta: number): void {
    if (this.matchFound) return

    this.sum += delta
    if (this.sum >= Time.avatarSwap) {
      this.sum = 0
      const i = Math.floor(Math.random() * 6)
      this.mysteryAvatar.setTexture(`avatar-${avatarNames[i]}Full`)
    }

    if (this.startTime === undefined) this.startTime = time
    const elapsedSeconds = (time - this.startTime) / 1000
    const seconds = Math.floor(elapsedSeconds) % 60
    const minutes = Math.floor(elapsedSeconds / 60) % 60
    const hours = Math.floor(elapsedSeconds / 3600)
    const timeString =
      hours > 0
        ? `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${
            seconds < 10 ? '0' : ''
          }${seconds}`
        : `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
    this.txtTime.setText(timeString)
  }

  // Call this when a match is found to animate and close the scene
  onMatchFound(): void {
    this.matchFound = true

    // If player has been waiting trivial time, don't bother animating
    if (parseInt(this.txtTime.text.replace(':', '')) <= 3) {
      this.scene.stop()
      return
    }

    this.txtTitle.setText('Opponent found')
    this.playSound('match found')

    this.tweens.add({
      targets: this.txtTitle,
      alpha: 0,
      time: Time.searchFlash,
      yoyo: true,
      onComplete: () => {
        this.scene.stop()
      },
    })
  }

  private createBackground(): void {
    let background = this.add
      .rectangle(
        0,
        0,
        Space.windowWidth,
        Space.windowHeight,
        Color.backgroundLight,
      )
      .setOrigin(0)
      .setInteractive()
      .setAlpha(0.4)
  }

  private createAvatars(avatarId: number): void {
    const scale = Math.min(1, Space.windowHeight / 600)
    this.add
      .image(
        -Space.windowWidth / 2,
        Space.windowHeight / 2,
        `avatar-${avatarNames[avatarId]}Full`,
      )
      .setScale(scale)
      .setOrigin(0, 0.5)

    this.mysteryAvatar = this.add
      .image(
        Space.windowWidth + Space.windowWidth / 2,
        Space.windowHeight / 2,
        `avatar-${avatarNames[0]}Full`,
      )
      .setScale(scale)
      .setTint(Color.grey)
      .setOrigin(1, 0.5)
  }

  private createText(): void {
    this.txtTitle = this.add
      .text(
        Space.windowWidth / 2,
        Space.windowHeight / 2 - 100,
        'Searching for an opponent',
        Style.announcement,
      )
      .setOrigin(0.5)

    this.txtTime = this.add
      .text(
        Space.windowWidth / 2,
        Space.windowHeight / 2,
        '',
        Style.announcement,
      )
      .setOrigin(0.5)
  }

  private addButtons(): void {
    const container = new ContainerLite(
      this,
      Space.windowWidth / 2,
      Space.windowHeight / 2 + 100,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: container,
      text: 'Cancel',
      f: () => this.doBack(),
    })
  }
}
