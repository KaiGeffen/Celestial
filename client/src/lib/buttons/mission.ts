import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { Space, Style, Color } from '../../settings/settings'
import Button from './button'

// Exported buttons
export default class MissionButton extends Button {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container,
    x: number,
    y: number,
    f: () => void = function () {},
    nodeType: string,
    small = false,
  ) {
    super(within, x, y, {
      icon: {
        name: nodeType.charAt(0).toUpperCase() + nodeType.slice(1),
        interactive: true,
      },
      callbacks: {
        click: f,
      },
      sound: {
        mute: nodeType === 'Mission' ? false : true,
      },
    })

    if (small) {
      this.icon.setScale(0.5)
    }
  }
}
