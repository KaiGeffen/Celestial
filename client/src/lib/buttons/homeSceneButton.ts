import 'phaser'
import Button from './button'
import { Style } from '../../settings/settings'

export default class HomeSceneButton extends Button {
  constructor({ within, x = 0, y = 0, f = () => {}, muteClick = false }) {
    super(within, x, y, {
      icon: {
        name: 'HomeButton',
        interactive: true,
      },
      callbacks: {
        click: f,
      },
      sound: {
        mute: muteClick,
      },
    })

    // Add drop shadow to the icon after it's created
    if (this.icon) {
      this.scene.plugins.get('rexDropShadowPipeline')['add'](this.icon, {
        distance: 3,
        angle: -45,
        shadowColor: 0x000000,
      })
    }
  }
}
