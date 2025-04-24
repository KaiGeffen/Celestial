import 'phaser'
import Button from './button'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { UserSettings } from '../../settings/userSettings'

export default class BasicButton extends Button {
  constructor({
    within,
    text = '',
    x = 0,
    y = 0,
    f = () => {},
    muteClick = false,
    returnHotkey = false,
    origin = [0.5, 0.5],
    depth = undefined,
  }) {
    super(within, x, y, {
      text: {
        text: text.toUpperCase(),
        interactive: false,
      },
      icon: {
        name: 'Button',
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

  // Button is a spritesheet with different states
  enable(): this {
    super.enable()
    this.icon.setFrame(0)

    return this
  }
  disable(): this {
    super.disable()
    this.icon.setFrame(1)

    return this
  }

  // Button is a spritesheet with different states
  glow(): this {
    this.icon.setFrame(2)

    return this
  }
  stopGlow(): this {
    this.icon.setFrame(0)

    return this
  }
}
