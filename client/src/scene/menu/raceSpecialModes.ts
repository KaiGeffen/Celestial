import 'phaser'
import MenuScene from '../menuScene'
import Menu from './menu'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { BasicButton } from '../../lib/buttons/basic'
import { Style, Space, UserSettings } from '../../settings/settings'

const width = 900

const modeNames: string[] = [
  'Start at 3 breath',
  'Instead of normal draws as the round starts, discard hand and draw 5',
  'When a card is added to the story, increase its points by 1 permanently',
  'At the end of each round, discard a card',
  'BROKEN: Cards with Fleeting are discarded instead of removed from the game',
]

export default class RaceSpecialModesMenu extends Menu {
  enabledModes: number[]
  modeButtons: BasicButton[] = []

  constructor(scene: MenuScene, params) {
    super(scene, width)

    // Load enabled modes from UserSettings, default to empty array
    this.enabledModes = UserSettings._get('raceEnabledModes') || []

    this.createContent()

    this.layout()
  }

  private createContent() {
    this.createHeader('Special Modes')

    // Create mode toggle buttons based on modeNames array length
    for (let i = 0; i < modeNames.length; i++) {
      this.createModeToggle(i)
    }
  }

  private createModeToggle(modeNumber: number) {
    const isEnabled = this.enabledModes.includes(modeNumber)
    const buttonText = isEnabled ? 'Enabled' : 'Disabled'

    let sizer = this.scene.rexUI.add.sizer({
      width: width - Space.pad * 2,
      space: { item: Space.pad },
    })

    const modeName = modeNames[modeNumber] || `Mode ${modeNumber}`
    const txt = this.scene.add.text(0, 0, modeName, Style.basic)

    let container = new ContainerLite(this.scene, 0, 0, Space.buttonWidth, 50)

    const button = new BasicButton({
      within: container,
      text: buttonText,
      f: () => {
        this.toggleMode(modeNumber)
      },
    })

    // Buttons are always enabled (clickable), text indicates mode state
    button.enable()

    this.modeButtons.push(button)

    sizer.add(txt).addSpace().add(container)
    this.sizer.add(sizer).addNewLine()
  }

  private toggleMode(modeNumber: number) {
    const index = this.enabledModes.indexOf(modeNumber)
    if (index > -1) {
      // Disable mode
      this.enabledModes.splice(index, 1)
      this.modeButtons[modeNumber].setText('Disabled')
    } else {
      // Enable mode
      this.enabledModes.push(modeNumber)
      this.modeButtons[modeNumber].setText('Enabled')
    }

    // Save to UserSettings
    UserSettings._set('raceEnabledModes', this.enabledModes)
  }
}
