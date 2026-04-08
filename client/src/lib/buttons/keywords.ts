import 'phaser'
import Button, { Config } from './button'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { Style, Space, Flags } from '../../settings/settings'
import { Keywords } from '../../../../shared/state/keyword'

/** Reword second-person keyword lines for the opponent’s status row (“they” not “you”). */
function hintForOpponentPerspective(s: string): string {
  return s.replace(/\byour\b/g, 'their').replace(/\byou\b/g, 'they')
}

function getHint(btn: Button, status: string, opponentPerspective?: boolean): string {
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

  setText(s: string): Button {
    let result = super.setText(s)

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
          name: `Sight`,
          interactive: true,
        },
        callbacks: {
          click: f,
        },
      },
    )
  }

  makeHintable(): Button {
    const s = `${getHint(this, 'Sight')}\nYour opponent doesn't know this.`

    return super.makeHintable(s)
  }
}
