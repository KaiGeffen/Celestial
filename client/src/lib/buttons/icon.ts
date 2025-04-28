import 'phaser'
import Button from './button'

export default class Icon extends Button {
  constructor({
    within,
    name,
    x = 0,
    y = 0,
    f = () => {},
    muteClick = false,
    hint = '',
  }) {
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

    if (hint) {
      this.makeHintable(hint)
    }
  }
}
