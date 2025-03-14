import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import OutlinePipelinePlugin from 'phaser3-rex-plugins/plugins/outlinepipeline-plugin.js'

import { Style, Color, Flags } from '../../settings/settings'

// Base abstraction of all buttons within the game
// Each button is composed of either or both text and an image
// Each subclass of this specifies which of those exists
// Which accepts input, glows, etc

interface Config {
  text?: {
    text: string
    interactive: boolean
    style?: Phaser.Types.GameObjects.Text.TextStyle
    offsetX?: number
    offsetY?: number
    hitArea?: any // TODO
  }
  icon?: {
    name: string
    interactive: boolean
    offsetY?: number
    noGlow?: boolean
    circular?: boolean
  }
  callbacks?: {
    click?: () => void
    hover?: () => void
    exit?: () => void
  }
  sound?: {
    mute?: boolean
  }
}

const ConfigDefaults = {
  text: {
    text: undefined,
    interactive: false,
    style: Style.button,
    hitArea: undefined,
    offsetX: 0,
    offsetY: 0,
    noGlow: false,
  },
  icon: {
    name: undefined,
    interactive: false,
    offsetY: 0,
    circular: false,
  },
  callbacks: {
    // click:, // NOTE Needed so that no-op + click sound doesnt play
    hover: () => {},
    exit: () => {},
  },
  sound: {
    mute: false,
  },
}

export default class Button {
  scene: Phaser.Scene

  txt: Phaser.GameObjects.Text
  icon: Phaser.GameObjects.Image

  selected = false
  enabled = false

  muteClick: boolean

  // Enabled, Selected, Highlighted, etc
  // Callbacks
  // Callbacks for each event
  onClick: () => void
  onHover: () => void
  onExit: () => void

  constructor(
    // The scene or container that this button is located within
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    config: Config,
  ) {
    // Load config defaults
    config = { ...ConfigDefaults, ...config }
    for (const [key, value] of Object.entries(config)) {
      config[key] = { ...ConfigDefaults[key], ...value }
    }
    this.muteClick = config.sound.mute

    // Define scene
    if (within instanceof Phaser.Scene) {
      this.scene = within
    } else if (
      within instanceof Phaser.GameObjects.Container ||
      within instanceof ContainerLite
    ) {
      this.scene = within.scene
    }

    // Create icon if it exists
    if (config.icon.name !== undefined) {
      let filename = config.icon.name.includes('-')
        ? config.icon.name
        : `icon-${config.icon.name}`
      this.icon = this.scene.add.image(x, y + config.icon.offsetY, filename)

      if (!config.icon.noGlow && !Flags.mobile) {
        this.icon
          .on('pointerover', () => this.glow())
          .on('pointerout', () => this.stopGlow())

        // When menu opens, stop glow
        this.scene.scene
          .get('MenuScene')
          .events.on('start', () => this.stopGlow())
      }

      // Add events (Even if not interactive)
      this.icon.on('pointerdown', () => {
        this.onClick()
      })
      if (!Flags.mobile) {
        this.icon
          .on('pointerover', () => {
            this.onHover()
          })
          .on('pointerout', () => {
            this.onExit()
          })
      }

      // Set interactive
      if (config.icon.interactive) {
        // Center the circle over and down by half the circle's width
        const x = this.icon.width / 2
        const hitarea = !config.icon.circular
          ? []
          : [new Phaser.Geom.Circle(x, x, x), Phaser.Geom.Circle.Contains]

        this.icon.setInteractive(...hitarea)

        this.enabled = config.icon.interactive
      }
    }

    // Create text if it exists
    if (config.text.text !== undefined) {
      this.txt = this.scene.add
        .text(
          x + config.text.offsetX,
          y + config.text.offsetY,
          config.text.text,
          config.text.style,
        )
        .setOrigin(0.5)

      // Set interactive
      if (config.text.interactive) {
        this.txt.setInteractive(...config.text.hitArea)

        if (!Flags.mobile) {
          this.txt
            .on(
              'pointerover',
              () => this.txt.setTint(Color.buttonHighlight),
              this,
            )
            .on('pointerout', () => this.txt.clearTint(), this)
            .on('pointerdown', () => {
              this.onClick()
            })
            .on('pointerover', () => {
              this.onHover()
            })
            .on('pointerout', () => {
              this.onExit()
            })
        } else {
          this.scene['rexGestures'].add
            .tap(this.txt, { tapInterval: 0 })
            .on('tap', () => {
              this.onClick()
            })
        }
      }
    }

    // Set the callbacks separate from the objects
    if (config.callbacks) {
      // Add default callbacks if not specified
      this.onClick = config.callbacks.click
        ? () => {
            config.callbacks.click()

            if (!this.muteClick) {
              this.scene.sound.play('click')
            }
          }
        : () => {}
      this.onHover = config.callbacks.hover
      this.onExit = config.callbacks.exit
    }

    // If within a container, add the objects to that container
    if (
      within instanceof Phaser.GameObjects.Container ||
      within instanceof ContainerLite
    ) {
      if (this.icon) {
        within.add(this.icon)
      }
      if (this.txt) {
        within.add(this.txt)
      }
    }
  }

  // Emulating phaser gameobject functions
  setOrigin(...args): Button {
    if (this.txt) {
      this.txt.setOrigin(...args)
    }
    if (this.icon) {
      this.icon.setOrigin(...args)
    }

    return this
  }

  // Emulating phaser gameobject functions
  setPosition(x = 0, y = 0): Button {
    if (this.txt) {
      this.txt.setPosition(x, y)
    }
    if (this.icon) {
      this.icon.setPosition(x, y)
    }

    return this
  }

  setVisible(value): Button {
    if (this.txt) {
      this.txt.setVisible(value)
    }
    if (this.icon) {
      this.icon.setVisible(value)
    }

    return this
  }

  isVisible(): boolean {
    if (this.txt) {
      return this.txt.visible
    }
    if (this.icon) {
      this.icon.visible
    }
  }

  setAlpha(value: number): Button {
    if (this.txt !== undefined) {
      this.txt.setAlpha(value)
    }

    if (this.icon !== undefined) {
      this.icon.setAlpha(value)
    }

    return this
  }

  select(): Button {
    this.icon.setTint(Color.buttonSelected)
    if (this.txt) {
      this.txt.setColor(Color.buttonTxtSelected)
    }

    this.selected = true

    return this
  }

  deselect(): Button {
    this.icon.clearTint()
    if (this.txt) {
      this.txt.setStyle(Style.basic)
    }

    this.selected = false

    return this
  }

  getText(): string {
    if (this.txt === undefined) {
      return ''
    } else {
      return this.txt.text
    }
  }

  destroy() {
    if (this.txt) {
      this.txt.destroy()
    }
    if (this.icon) {
      this.icon.destroy()
    }
  }

  // The glow effect button has while hovered
  glow() {
    let plugin = this.scene.plugins.get('rexOutlinePipeline')
    plugin['add'](this.icon || this.txt, {
      thickness: 3,
      outlineColor: Color.outline,
      quality: 0.3,
    })

    return this
  }
  stopGlow() {
    let plugin = this.scene.plugins.get('rexOutlinePipeline')
    plugin['remove'](this.icon || this.txt)

    return this
  }

  // Set the on click callback for this button
  // If once, only perform this callback once, then disable the button
  // If overwrite, take away the onClick that existed before
  setOnClick(f, once = false, overwrite = true): Button {
    if (!overwrite) {
      // TODO Issues with multiple 'click' sound playing
      f = thisThenThat(this.onClick, f)
    }

    this.onClick = () => {
      if (!this.muteClick) {
        this.scene.sound.play('click')
      }
      f()
      if (once) {
        this.disable()
      }
    }

    return this
  }

  // Get the global position of this object
  getGlobalPosition(): [number, number] {
    const obj = this.icon !== undefined ? this.icon : this.txt
    let x = obj.x
    let y = obj.y

    let container = obj.parentContainer
    while (container !== null) {
      x += container.x
      y += container.y
      container = container.parentContainer
    }

    return [x, y]
  }

  setOnHover(hoverCallback, exitCallback): Button {
    this.onHover = hoverCallback
    this.onExit = exitCallback

    return this
  }

  setText(s: string): Button {
    if (this.txt !== undefined) {
      this.txt.setText(s)
    }

    return this
  }

  setTexture(texture: string): Button {
    this.icon.setTexture(texture)

    return this
  }

  setDepth(value: number): Button {
    if (this.txt !== undefined) {
      this.txt.setDepth(value)
    }
    if (this.icon !== undefined) {
      this.icon.setDepth(value)
    }

    return this
  }

  enable(b = true) {
    if (!b) {
      return this.disable()
    }

    if (this.icon !== undefined) {
      this.icon.setInteractive()

      this.icon.setAlpha(1)
    }

    this.enabled = true

    return this
  }
  disable() {
    // TODO Clarify if text interaction is supported
    if (this.txt !== undefined) {
      this.txt.disableInteractive().emit('pointerout')
    }
    if (this.icon !== undefined) {
      this.icon.disableInteractive().emit('pointerout')

      this.icon.setAlpha(0.5)
    }

    this.enabled = false

    return this
  }

  highlight() {}

  // Set the subtype's individual characteristic, implemented by some buttons
  setQuality(args): Button {
    throw `Button type ${typeof this} doesn't have a quality to set.`
  }

  // Set the object to not scroll with the camera
  setNoScroll(): Button {
    if (this.txt) {
      this.txt.setScrollFactor(0, 0)
    }

    if (this.icon) {
      this.icon.setScrollFactor(0, 0)
    }

    return this
  }

  // Enable a hint to show when this button is hovered
  makeHintable(s?: string): Button {
    if (s !== undefined) {
      this.setOnHover(
        () => {
          this.scene['hint'].showText(s)
        },
        () => {
          this.scene['hint'].hide()
        },
      )
    }

    return this
  }

  setFrame(frame: number): this {
    if (this.icon === undefined) {
      throw new Error(
        'Tried to set frame for a button that doesnt have frames.',
      )
    }

    this.icon.setFrame(frame)

    return this
  }
}

function thisThenThat(f: () => void, g: () => void): () => void {
  return function () {
    f()
    g()
  }
}
