import 'phaser'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'
import GesturesPlugin from 'phaser3-rex-plugins/plugins/gestures-plugin.js'

import { BBStyle, Time, Space, Flags } from '../settings/settings'
import Button from '../lib/buttons/button'
import Icons from '../lib/buttons/icons'
import Hint from '../lib/hint'
import ensureMusic from '../loader/audioManager'

// Functionality shared between BaseScene and MenuBaseScene
class SharedBaseScene extends Phaser.Scene {
  // Allows for typing objects in RexUI library
  rexUI: RexUIPlugin
  rexGestures: GesturesPlugin

  // Message explaining to user what they did wrong
  txtMessage: RexUIPlugin.BBCodeText

  // Timeout for displaying a message onscreen
  msgTimeout: NodeJS.Timeout

  // Text explaining whatever the user is hovering over
  hint: Hint

  create(params = {}): void {
    this.hint = new Hint(this)

    // Text for when user does something and gets a message
    this.txtMessage = this.createMessageText()
  }

  private createMessageText(): RexUIPlugin.BBCodeText {
    return this.rexUI.add
      .BBCodeText(
        Space.windowWidth / 2,
        Space.windowHeight / 2,
        '',
        BBStyle.error,
      )
      .setOrigin(0.5)
      .setDepth(50)
      .setVisible(false)
  }

  // Show the user a message onscreen
  showMessage(msg = ''): void {
    this.txtMessage.setText(`[stroke=black]${msg}[/stroke]`).setVisible(true)

    // Remove previous timeout, create a new one
    if (this.msgTimeout !== undefined) {
      clearTimeout(this.msgTimeout)
    }

    this.msgTimeout = setTimeout(() => {
      this.txtMessage.setText('').setVisible(false)
    }, Time.onscreenMessage)
  }

  // Alert the user that they have taken an illegal or impossible action
  signalError(msg = ''): void {
    this.sound.play('failure')

    this.showMessage(msg)
  }

  // Overwritten by the scenes that extend this
  beforeExit(): void {}

  // Play the given sound, or one of its variants if it has any
  playSound(s: string): void {
    const amt_variants = {
      open: 2,
      close: 2,
      play: 4,
      'play them': 4,
      discard: 3,
      create: 3,
      resolve: 5,
    }
    if (s in amt_variants) {
      s += ` ${this.getRandomInRange(amt_variants[s])}`
    }

    // Check if sound exists before playing
    try {
      this.sound.play(s)
    } catch (e) {
      console.log(`Sound '${s}' not loaded yet`)
    }
  }

  // Get a random number from 1 to max, inclusive
  private getRandomInRange(max: number): number {
    return 1 + Math.floor(Math.random() * max)
  }
}

// What scenes on the bottom (Not menus) inherit their common functionality from
export default class BaseScene extends SharedBaseScene {
  private btnOptions: Button

  // The last scene before this one
  private lastScene: string

  constructor(args) {
    super(args)
    this.lastScene = args.lastScene
  }

  create(params = {}): void {
    super.create(params)

    // On mobile, ensure music is playing the first time a click happens
    if (Flags.mobile) {
      this.input.once('pointerdown', () => {
        ensureMusic(this)
      })
    }

    // Menu button
    this.btnOptions = new Icons.Options(
      this,
      Space.windowWidth - Space.pad,
      Space.pad,
      this.openMenu(),
    )
      .setOrigin(1, 0)
      .setDepth(10)
      .setNoScroll()

    // When esc key is pressed, toggle the menu open/closed
    let esc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    esc.on('down', this.openMenu(), this)
  }

  doExit(): () => void {
    let that = this

    return function () {
      that.beforeExit()
      that.scene.start('HomeScene')
    }
  }

  // Go back to the last scene
  // Return whether a last scene was saved
  doBack() {
    if (this.lastScene === undefined) {
      throw 'Last scene is undefined'
    } else {
      this.beforeExit()
      this.scene.stop('MenuScene')
      this.scene.start(this.lastScene)
    }
  }

  private openMenu(): () => void {
    let that = this

    return function () {
      // TODO This check for multiple open menus should be handled in menuScene.ts

      // Don't open the menu if it's open already
      if (that.scene.isActive('MenuScene')) {
        return
      }

      that.scene.launch('MenuScene', {
        menu: 'options',
        activeScene: that,
      })
    }
  }
}

// The common functionality shared by menu scenes
export class BaseMenuScene extends SharedBaseScene {}
