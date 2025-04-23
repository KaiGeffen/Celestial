import 'phaser'
import Button from './button'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
// TODO Use this in more places for buttons
export interface IconArgs {
  within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite
  name: string
  x?: number
  y?: number
  f?: () => void
  muteClick?: boolean
}

export default class Icon extends Button {
  constructor({
    within,
    name,
    x = 0,
    y = 0,
    f = () => {},
    muteClick = false,
  }: IconArgs) {
    super(within, x, y, {
      icon: {
        name,
        interactive: true,
      },
      callbacks: {
        click: f,
      },
      sound: {
        mute: muteClick,
      },
    })
  }
}
