import 'phaser'
import Button from './button'
import { Style, Color, Space, Flags } from '../../settings/settings'
import RoundRectangle from 'phaser3-rex-plugins/plugins/roundrectangle.js'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'

export default class HomeSceneButton extends Button {
  private background: RoundRectangle

  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container,
    x: number,
    y: number,
    text: string,
    f: () => void = () => {},
    muteClick: boolean = false,
  ) {
    super(within, x, y, {
      text: {
        text: text.toUpperCase(),
        interactive: false,
        style: {
          ...Style.button,
          fontFamily: 'Cinzel',
          fontSize: '40px',
          color: Color.backgroundLightS,
        },
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
  }
}
