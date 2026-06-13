import 'phaser'
import Button from './button'
import avatarNames from '../../../../shared/data/avatarNames'
import borderNames from '../../data/borderNames'
import { Color, Time } from '../../settings/settings'

const noOp = () => {}

// Used when selected an avatar, when editing an avatar, and in a match
export default class AvatarButton extends Button {
  name: string
  private border: Phaser.GameObjects.Image

  constructor({
    within,
    name = 'Jules',
    avatarId = undefined,
    border = 0,
    x = 0,
    y = 0,
    f = noOp,
    origin = [0.5, 0.5],
    muteClick = false,
  }) {
    if (avatarId !== undefined) {
      name = avatarNames[avatarId]
    }

    super(within, x, y, {
      icon: {
        name: `avatar-${name}`,
        interactive: f !== noOp,
      },
      callbacks: {
        click: f,
      },
      sound: {
        mute: muteClick,
      },
    })

    this.name = name

    // Make the border
    this.border = this.scene.add.image(x, y, `border-${borderNames[border]}`)
    within.add(this.border)

    this.setOrigin(...origin)
  }

  setOnClick(f, once = false, overwrite = true): Button {
    let fWithSound = () => {
      f()
    }

    return super.setOnClick(fWithSound, once, overwrite)
  }

  setOrigin(...args): Button {
    super.setOrigin(...args)
    this.border.setOrigin(...args)

    return this
  }

  // Override the default select so it doesn't grey the image
  select(): Button {
    this.icon.clearTint()
    this.border.clearTint()

    this.selected = true

    return this
  }

  deselect(): Button {
    this.icon.setTint(Color.avatarDeselected)
    this.border.setTint(Color.avatarDeselected)

    this.selected = false

    return this
  }

  // Darken-tween state: 0 = bright, 1 = fully darkened
  private darkenValue = 0
  private darkenTarget = 0
  private darkenTween: Phaser.Tweens.Tween

  /** Fade the icon + border toward darkened or bright over `duration` ms. */
  setDarkened(darkened: boolean, duration: number): this {
    const target = darkened ? 1 : 0
    // Already at / tweening to this state — don't restart the tween.
    if (this.darkenTarget === target) return this
    this.darkenTarget = target

    this.darkenTween?.remove()

    const dark = Color.avatarDeselected
    const dr = (dark >> 16) & 0xff
    const dg = (dark >> 8) & 0xff
    const db = dark & 0xff

    const proxy = { v: this.darkenValue }
    this.darkenTween = this.scene.tweens.add({
      targets: proxy,
      v: target,
      duration,
      onUpdate: () => {
        this.darkenValue = proxy.v
        // Interpolate white -> grey by progress and tint both layers
        const r = Math.round(255 + (dr - 255) * proxy.v)
        const g = Math.round(255 + (dg - 255) * proxy.v)
        const b = Math.round(255 + (db - 255) * proxy.v)
        const tint = (r << 16) | (g << 8) | b
        this.icon.setTint(tint)
        this.border.setTint(tint)
      },
    })

    return this
  }

  setAvatar(i: number): this {
    this.name = avatarNames[i]
    this.setTexture(`avatar-${this.name}`)

    return this
  }

  setBorder(border: number): this {
    this.border.setTexture(`border-${borderNames[border]}`)

    return this
  }

  timeout: NodeJS.Timeout
  doEmote(number = 1): void {
    // Get dialog audio element
    const dialogAudio = document.getElementById('dialog') as HTMLAudioElement

    // Set the source and play
    dialogAudio.src = `assets/dialog/${this.name}.opus`
    dialogAudio.currentTime = 0
    dialogAudio.play()

    // Stop the timeout if it exists
    clearTimeout(this.timeout)

    this.icon.setFrame(number)

    // Keep track of this timeout
    this.timeout = setTimeout(() => {
      this.icon.setFrame(0)
    }, Time.general.avatarEmoteMs)
  }
}
