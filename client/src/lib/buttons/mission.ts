import 'phaser'
import Button from './button'

// TODO Only used by the deprecated raceScene; remove with it
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
