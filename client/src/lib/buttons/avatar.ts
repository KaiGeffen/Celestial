import 'phaser'
import Button from './button'
import avatarNames from '../../lib/avatarNames'
import { Color, Time } from '../../settings/settings'

// TODO As this grows move it to another file
const borderNames = ['None', 'Thorns']

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
    f = () => {},
    emotive = false,
    origin = [0.5, 0.5],
    muteClick = false,
  }) {
    if (avatarId !== undefined) {
      name = avatarNames[avatarId]
    }

    super(within, x, y, {
      icon: {
        name: `avatar-${name}`,
        interactive: true,
      },
      callbacks: {
        click: f,
      },
      sound: {
        mute: emotive || muteClick,
      },
    })

    this.name = name

    // Make the border
    this.border = this.scene.add.image(x, y, `border-${borderNames[border]}`)
    within.add(this.border)

    this.setOrigin(...origin)

    // Set it so the avatar emotes briefly when clicked
    if (emotive) {
      this.onClick = () => this.doEmote()
    }
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

    this.selected = true

    return this
  }

  deselect(): Button {
    this.icon.setTint(Color.avatarDeselected)

    this.selected = false

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
    dialogAudio.src = `assets/dialog/${this.name}.mp3`
    dialogAudio.currentTime = 0
    dialogAudio.play()

    // Stop the timeout if it exists
    clearTimeout(this.timeout)

    this.icon.setFrame(number)

    // Keep track of this timeout
    this.timeout = setTimeout(() => {
      this.icon.setFrame(0)
    }, Time.emote)
  }
}
