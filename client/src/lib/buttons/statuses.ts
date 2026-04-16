import 'phaser'
import Button, { Config } from './button'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { Style } from '../../settings/settings'
import { Keywords } from '../../../../shared/state/keyword'

const STATUS_TEXT_INSPIRE = '#1c2962'
const STATUS_TEXT_NOURISH = '#053327'
const STATUS_TEXT_SIGHT = '#632709'

/** Status row icons are ~90px apart; keep the value glyph within a single slot. */
const STATUS_VALUE_MAX_WIDTH_PX = 20

/** Reword second-person keyword lines for the opponent’s status row (“they” not “you”). */
function hintForOpponentPerspective(s: string): string {
  return s.replace(/\byour\b/g, 'their').replace(/\byou\b/g, 'they')
}

function getHint(
  btn: Button,
  status: string,
  opponentPerspective?: boolean,
): string {
  let keyword = Keywords.get(status)

  let s = keyword.text

  // Remove the first X (In image data)
  s = s.replace(' X', '')

  // Get the value from the given status button
  const value = btn.getText()
  s = s.split(/\bX\b/).join(value)

  // Fix: Special case for occurrences of +X, where X could be -N, so you want -N instead of +-N
  // This matches the logic in hint.ts showKeyword function
  s = s.split(/\+\-/).join('-')

  if (opponentPerspective) {
    s = hintForOpponentPerspective(s)
  }

  return s
}

class KeywordButton extends Button {
  protected readonly opponentPerspective: boolean

  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    config: Config,
    opponentPerspective: boolean = false,
  ) {
    super(within, x, y, config)
    this.opponentPerspective = opponentPerspective
  }

  protected applyStatusTextColor(color: string): void {
    if (this.txt) {
      this.txt.setColor(color)
    }
  }

  setText(s: string): Button {
    const result = super.setText(s)

    if (this.txt) {
      this.txt.setScale(1)
      const w = this.txt.width
      if (w > STATUS_VALUE_MAX_WIDTH_PX) {
        this.txt.setScale(STATUS_VALUE_MAX_WIDTH_PX / w)
      }
    }

    this.makeHintable()

    return result
  }

  // Keep the text centered
  setOrigin(...args): Button {
    this.icon.setOrigin(...args)

    return this
  }
}

export class InspireButton extends KeywordButton {
  constructor(
    within: Phaser.GameObjects.Container,
    x: number,
    y: number,
    text: string = '',
    f: () => void = function () {},
    opponentPerspective: boolean = false,
  ) {
    super(
      within,
      x,
      y,
      {
        text: {
          text: text,
          interactive: false,
          style: Style.basic,
          offsetX: 15,
        },
        icon: {
          name: `Inspire`,
          interactive: true,
        },
        callbacks: {
          click: f,
        },
      },
      opponentPerspective,
    )
    this.applyStatusTextColor(STATUS_TEXT_INSPIRE)
  }

  makeHintable(): Button {
    const s = getHint(this, 'Inspired', this.opponentPerspective)

    return super.makeHintable(s)
  }
}

export class NourishButton extends KeywordButton {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    text: string = '',
    f: () => void = function () {},
    opponentPerspective: boolean = false,
  ) {
    super(
      within,
      x,
      y,
      {
        text: {
          text: text,
          interactive: false,
          style: Style.basic,
          offsetX: 15,
        },
        icon: {
          name: `Nourish`,
          interactive: true,
        },
        callbacks: {
          click: f,
        },
      },
      opponentPerspective,
    )
    this.applyStatusTextColor(STATUS_TEXT_NOURISH)
  }

  makeHintable(): Button {
    const s = getHint(this, 'Nourish', this.opponentPerspective)

    return super.makeHintable(s)
  }
}

export class SightButton extends KeywordButton {
  constructor(
    within: Phaser.GameObjects.Container,
    x: number,
    y: number,
    text: string = '',
    f: () => void = function () {},
  ) {
    super(within, x, y, {
      text: {
        text: text,
        interactive: false,
        style: Style.basic,
        offsetX: 15,
      },
      icon: {
        name: `Sight`,
        interactive: true,
      },
      callbacks: {
        click: f,
      },
    })
    this.applyStatusTextColor(STATUS_TEXT_SIGHT)
  }

  makeHintable(): Button {
    const s = `${getHint(this, 'Sight')}\nYour opponent doesn't know this.`

    return super.makeHintable(s)
  }
}

export class PossibilityButton extends KeywordButton {
  constructor(
    within: Phaser.GameObjects.Container,
    x: number,
    y: number,
    text: string = '',
    f: () => void = function () {},
    opponentPerspective: boolean = false,
  ) {
    super(
      within,
      x,
      y,
      {
        text: {
          text: text,
          interactive: false,
          style: Style.basic,
          offsetX: 15,
        },
        icon: {
          name: `Inspire`,
          interactive: true,
        },
        callbacks: {
          click: f,
        },
      },
      opponentPerspective,
    )
    this.applyStatusTextColor(STATUS_TEXT_INSPIRE)
  }

  makeHintable(): Button {
    const s = getHint(this, 'Possibility', this.opponentPerspective)

    return super.makeHintable(s)
  }
}
