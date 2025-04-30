import 'phaser'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'
import GesturesPlugin from 'phaser3-rex-plugins/plugins/gestures-plugin.js'

import { BBStyle, Time, Space, Flags, Color, Style } from '../settings/settings'
import Button from '../lib/buttons/button'
import Hint from '../lib/hint'
import ensureMusic from '../loader/audioManager'
import Buttons from '../lib/buttons/buttons'
import UserDataServer from '../network/userDataServer'

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
    this.btnOptions = new Buttons.Icon({
      name: 'Options',
      within: this,
      x: Space.windowWidth - Space.pad,
      y: Space.pad,
      f: this.openMenu(),
      muteClick: true,
    })
      .setOrigin(1, 0)
      .setDepth(10)
      .setNoScroll()

    // When esc key is pressed, toggle the menu open/closed
    let esc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    esc.on('down', this.openMenu(), this)
  }

  doExit(): () => void {
    return () => {
      this.beforeExit()
      this.scene.start('HomeScene')
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
    return () => {
      // TODO This check for multiple open menus should be handled in menuScene.ts

      // Don't open the menu if it's open already
      if (this.scene.isActive('MenuScene')) {
        return
      }

      this.scene.launch('MenuScene', {
        menu: 'options',
        activeScene: this,
      })
    }
  }
}

export class BaseSceneWithHeader extends BaseScene {
  protected headerHeight = Space.iconSize + Space.pad * 2
  private userStatsDisplay: Phaser.GameObjects.Text

  create(params): void {
    super.create(params)

    this.createHeader(params.title)
  }

  update(time: number, delta: number): void {
    super.update(time, delta)

    this.updateUserStatsDisplay()
  }

  private updateUserStatsDisplay(): void {
    // Update the user stats display
    // Get user data, use defaults if not logged in
    const username = UserDataServer.getUserData().username || 'Guest'
    const elo = UserDataServer.getUserData().elo || 1200
    const gems = UserDataServer.getUserData().gems || 0
    const coins = UserDataServer.getUserData().coins || 0

    // Set the text to the user's stats (Which might update)
    this.userStatsDisplay.setText(`${username} (${elo}) ${gems}💎 ${coins}💰`)
  }

  private createHeader(title: string): void {
    // Make the background header
    let background = this.add
      .rectangle(
        0,
        0,
        Space.windowWidth,
        this.headerHeight,
        Color.backgroundLight,
      )
      .setOrigin(0)

    this.plugins.get('rexDropShadowPipeline')['add'](background, {
      distance: 3,
      angle: -90,
      shadowColor: 0x000000,
    })

    // Create back button
    new Buttons.Basic({
      within: this,
      text: 'Back',
      x: Space.pad + Space.buttonWidth / 2,
      y: this.headerHeight / 2,
      f: () => {
        this.sound.play('click')
        this.scene.start('HomeScene')
      },
    })

    // Create title back in center
    this.add
      .text(
        Space.windowWidth / 2,
        this.headerHeight / 2,
        title,
        Style.homeTitle,
      )
      .setOrigin(0.5)

    // Add user info
    this.createUserStatsDisplay()
  }

  private createUserStatsDisplay(): void {
    // Create the text object displaying user stats
    this.userStatsDisplay = this.add
      .text(
        Space.windowWidth - (Space.pad * 2 + Space.iconSize),
        this.headerHeight / 2,
        '',
        Style.basic,
      )
      .setOrigin(1, 0.5)

    // Set the text's values
    this.updateUserStatsDisplay()
  }
}

// The common functionality shared by menu scenes
export class BaseMenuScene extends SharedBaseScene {}
