import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { Style, Url, Flags } from '../../settings/settings'
import Button from './button'

// Exported buttons
class Options extends Button {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container,
    x: number,
    y: number,
    f: () => void = () => {},
  ) {
    super(within, x, y, {
      icon: {
        name: 'Options',
        interactive: true,
      },
      callbacks: {
        click: f,
      },
      sound: {
        mute: true,
      },
    })
  }
}

class SmallX extends Button {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    f: () => void = () => {},
    muteClick: boolean = false,
  ) {
    super(within, x, y, {
      icon: {
        name: 'SmallX',
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

class Share extends Button {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    f: () => void = () => {},
  ) {
    super(within, x, y, {
      icon: {
        name: 'Share',
        interactive: true,
      },
      callbacks: {
        click: f,
      },
    })
  }
}

class Edit extends Button {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    f: () => void = () => {},
  ) {
    super(within, x, y, {
      icon: {
        name: 'Edit',
        interactive: true,
      },
      callbacks: {
        click: f,
      },
      sound: {
        mute: true,
      },
    })
  }
}

class Distribution extends Button {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    f: () => void = () => {},
  ) {
    super(within, x, y, {
      icon: {
        name: 'Distribution',
        interactive: true,
      },
      callbacks: {
        click: f,
      },
      sound: {
        mute: true,
      },
    })
  }
}

class New extends Button {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    f: () => void = () => {},
  ) {
    super(within, x, y, {
      icon: {
        name: 'New',
        interactive: true,
      },
      callbacks: {
        click: f,
      },
      sound: {
        mute: true,
      },
    })
  }
}

class Recap extends Button {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    f: () => void = () => {},
  ) {
    super(within, x, y, {
      icon: {
        name: 'Recap',
        interactive: true,
      },
      callbacks: {
        click: f,
      },
    })
  }
}

class Skip extends Button {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    f: () => void = () => {},
  ) {
    super(within, x, y, {
      icon: {
        name: 'Skip',
        interactive: true,
      },
      callbacks: {
        click: f,
      },
    })
  }
}

class Speed extends Button {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    f: () => void = () => {},
  ) {
    super(within, x, y, {
      icon: {
        name: 'Speed',
        interactive: true,
      },
      callbacks: {
        click: f,
      },
    })
  }
}

class Arrow extends Button {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    theta: number, // In 90 degree increments from north
    f: () => void = () => {},
  ) {
    super(within, x, y, {
      icon: {
        name: 'Arrow',
        interactive: true,
      },
      callbacks: {
        click: f,
      },
    })

    this.icon.setRotation((theta * Math.PI) / 2)
  }
}

// TODO Not really an icon, move somewhere else?
class Pass extends Button {
  // Used in the tutorial to reduce the functionality while player is learning
  tutorialSimplifiedPass = false

  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container,
    x: number,
    y: number,
    f: () => void = () => {},
  ) {
    super(within, x, y, {
      text: {
        text: 'PASS',
        interactive: false,
        style: Style.pass,
      },
      icon: {
        name: `${Flags.mobile ? 'Mobile' : ''}Sun`,
        interactive: true,
        circular: true,
      },
      callbacks: {
        click: f,
      },
    })
  }

  enable() {
    // For the tutorial, disable pass button
    if (this.tutorialSimplifiedPass) {
      console.log('enable pass')
      this.icon.setAlpha(1)
      return this
    }

    this.setText('PASS')
    super.enable()

    return this
  }

  disable() {
    // TODO Have this be on a cloud instead
    // this.setText('THEIR\nTURN')
    this.setText('')
    super.disable()

    return this
  }
}

class Moon extends Button {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container,
    x: number,
    y: number,
    f: () => void = () => {},
  ) {
    super(within, x, y, {
      text: {
        text: '',
        interactive: false,
        style: Style.moon,
      },
      icon: {
        name: `${Flags.mobile ? 'Mobile' : ''}Moon`,
        interactive: true,
        circular: true,
      },
      callbacks: {
        click: f,
      },
    })

    // Rotate 180 since moon always viewed upside down
    this.txt.setRotation(Math.PI).setAlign('center')
  }
}

// The search icon
class Search extends Button {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    f: () => void = () => {},
  ) {
    super(within, x, y, {
      icon: {
        name: 'Search',
        interactive: true,
      },
      callbacks: {
        click: f,
      },
      sound: {
        mute: true,
      },
    })
  }
}

class Discord extends Button {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    f: () => void = () => {},
  ) {
    super(within, x, y, {
      icon: {
        name: 'Discord',
        interactive: true,
      },
      callbacks: {
        click: () => {
          window.open(Url.discord)
        },
      },
    })
  }
}

// Export all of the available icons, which are subtype of buttons
export default class Icons {
  static Options = Options
  static SmallX = SmallX
  static Share = Share
  static Edit = Edit
  static Distribution = Distribution
  static New = New
  static Recap = Recap
  static Speed = Speed
  static Skip = Skip
  static Arrow = Arrow
  static Pass = Pass
  static Moon = Moon
  static Search = Search
  static Discord = Discord
}
