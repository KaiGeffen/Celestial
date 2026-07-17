import 'phaser'
import Button from './button'

const DESELECTED_ALPHA = 0.3

export default class UButton extends Button {
  selected: boolean = false

  constructor(
    within: any,
    x: number,
    y: number,
    text: string,
    f: () => void = () => {},
  ) {
    super(within, x, y, {
      text: {
        text: text,
        interactive: true,
        hitArea: [
          new Phaser.Geom.Rectangle(-10, -5, 35, 40),
          Phaser.Geom.Rectangle.Contains,
        ],
      },
      icon: {
        name: 'Underline',
        interactive: false,
        offsetY: 20,
      },
      callbacks: {
        click: f,
      },
    })

    // Make icon barely visible
    this.icon.setAlpha(DESELECTED_ALPHA)
  }

  // Toggle this button on or off and return its new value
  toggle(): boolean {
    this.selected = !this.selected

    if (this.selected) {
      this.icon.setAlpha(1)
    } else {
      this.icon.setAlpha(DESELECTED_ALPHA)
    }

    return this.selected
  }

  toggleOff(): void {
    this.selected = false
    this.icon.setAlpha(DESELECTED_ALPHA)
  }
}
