import 'phaser'
import Button from './button'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { UserSettings } from '../../settings/userSettings'

class BaseButton extends Button {
  constructor(
    icon: string,
    {
      within,
      text = '',
      x = 0,
      y = 0,
      f = () => {},
      muteClick = false,
      returnHotkey = false,
      origin = [0.5, 0.5],
      depth = undefined,
    },
  ) {
    super(within, x, y, {
      text: {
        text: text.toUpperCase(),
        interactive: false,
      },
      icon: {
        name: icon,
        interactive: true,
      },
      callbacks: {
        click: f,
      },
      sound: {
        mute: muteClick,
      },
    })

    this.icon.setOrigin(...origin)
    if (depth !== undefined) {
      // TODO Maybe remove setDepth and just put impl here
      this.setDepth(depth)
    }

    // If return hotkey is enabled, add a listener for the return key
    if (returnHotkey) {
      this.scene.input.keyboard.on('keydown-ENTER', () => {
        if (this.enabled && UserSettings._get('hotkeys')) {
          f()
        }
      })
    }
  }

  setText(s: string): Button {
    return super.setText(s.toUpperCase())
  }

  /** `BigButton` uses a 3-frame spritesheet; plain `BasicButton` uses a single image (`icon-Button`). */
  private iconIsSpritesheet(): boolean {
    return this.icon.texture.frameTotal > 1
  }

  enable(): this {
    super.enable()
    if (this.iconIsSpritesheet()) this.icon.setFrame(0)

    return this
  }

  disable(): this {
    super.disable()
    if (this.iconIsSpritesheet()) this.icon.setFrame(1)

    return this
  }

  glow(): this {
    super.glow()
    if (this.iconIsSpritesheet()) this.icon.setFrame(2)

    return this
  }

  stopGlow(): this {
    super.stopGlow()
    if (this.iconIsSpritesheet()) this.icon.setFrame(0)

    return this
  }
}

export class BasicButton extends BaseButton {
  constructor(args) {
    super('Button', args)
  }
}

export class BigButton extends BaseButton {
  constructor(args) {
    super('BigButton', args)

    // Increase font size
    this.txt.setFontSize(35)
  }
}
