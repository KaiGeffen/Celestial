import 'phaser'
import Button from './button'
import { Style, Color, Space, Flags } from '../../settings/settings'
import RoundRectangle from 'phaser3-rex-plugins/plugins/roundrectangle.js'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'

export default class HomeSceneButton extends Button {
  constructor({
    within,
    x = 0,
    y = 0,
    text = '',
    f = () => {},
    muteClick = false,
  }) {
    super(within, x, y, {
      text: {
        text: text.toUpperCase(),
        interactive: false,
        style: Style.homeSceneButton,
      },
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
