import 'phaser'
import jwt_decode from 'jwt-decode'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'
import type { CredentialResponse } from 'google-one-tap'
import type { GoogleJwtPayload } from '../types/google'
import Loader from '../loader/loader'
import UserDataServer from '../network/userDataServer'
import {
  Color,
  Space,
  Style,
  BBStyle,
  Url,
  UserSettings,
  Flags,
} from '../settings/settings'
import Button from '../lib/buttons/button'
import Buttons from '../lib/buttons/buttons'
import ensureMusic from '../loader/audioManager'
import Cinematic from '../lib/cinematic'
import { TUTORIAL_LENGTH } from '../../../shared/settings'

// Scene for user to select a sign in option, without loading assets
export class SigninScene extends Phaser.Scene {
  // Allows for typing objects in RexUI library
  rexUI: RexUIPlugin

  // True when user is signed or chose to be a guest
  signedInOrGuest: boolean = false
  guestButton: Button

  constructor(args) {
    super({
      key: args === undefined ? 'SigninScene' : args.key,
    })
  }

  create(): void {
    // Sign in button is visible while on this scene and hidden otherwise
    document.getElementById('signin').hidden = false
    this.events.on('shutdown', () => {
      document.getElementById('signin').hidden = true
    })

    // Ensure user is signed out
    UserSettings.clearSessionStorage()

    // Ensure animation is displayed
    Cinematic.ensure()

    // Add buttons to sign in or play as a guest
    this.createButtons()

    // On mobile, encourage user to lock in landscape mode
    if (Flags.mobile) {
      this.createLandscapeMessaging()
    }
  }

  // Create buttons for each of the signin options (Guest, OAuth)
  private createButtons(): void {
    const x = Space.windowWidth / 2
    const y = Space.windowHeight - Space.buttonHeight / 2 - Space.pad

    this.guestButton = new Buttons.Basic({
      within: this,
      text: 'Guest',
      x,
      y,
      f: () => {
        this.onOptionClick()
      },
      depth: -1,
    })
      // Hide the guest button if user is already signed in
      .setVisible(localStorage.getItem('gsi_token') === null)

    // TODO Use y value
    this.createGoogleGSIButton()
  }

  // Create elements which encourage the user to be in landscape mode
  private createLandscapeMessaging(): void {
    function isLandscape() {
      switch (screen.orientation.type) {
        case 'landscape-primary':
        case 'landscape-secondary':
          return true
        default:
          return false
      }
    }

    let txt = this.rexUI.add
      .BBCodeText(
        Space.windowWidth / 2,
        Space.windowHeight / 2,
        'Use landscape mode',
        BBStyle.error,
      )
      .setOrigin(0.5)
      .setInteractive()
      .setVisible(!isLandscape())

    screen.orientation.onchange = () => {
      // Brief delay to ensure that dimensions have changed
      setTimeout(() => {
        // Center guest button
        const x = window.innerWidth / 2
        const y = window.innerHeight / 2
        this.guestButton.setPosition(x, y)
        txt.setPosition(x, y)
      }, 5)

      // Set blocking text visibility based on new orientation
      txt.setVisible(!isLandscape())
    }
  }

  private onOptionClick(): void {
    this.signedInOrGuest = true

    // Make the buttons unclickable
    this.guestButton.disable()
    document.getElementById('signin').hidden = true

    // Ensure that music is playing
    ensureMusic(this)

    if (!this.load.isLoading()) {
      this.startFirstScene()
    }
  }

  private createGoogleGSIButton(): void {
    google.accounts.id.initialize({
      client_id: Url.oauth,
      log_level: 'debug',
      ux_mode: 'popup',
      auto_select: true,
      callback: (token: CredentialResponse) => {
        // Store the token for next time
        localStorage.setItem('gsi_token', token.credential)

        const payload = jwt_decode<GoogleJwtPayload>(token.credential)

        // Send jti to confirm connection. After server responds, complete login
        UserDataServer.login(payload, this.game, () => this.onOptionClick())
      },
    })

    // Render Sign In button
    google.accounts.id.renderButton(document.getElementById('signin'), {
      theme: 'filled_black',
      size: 'large',
      shape: 'rectangular',
      text: 'signin',
      width: Space.buttonWidth,
    })

    // User was previously signed in, try to auto-login
    const storedToken = localStorage.getItem('gsi_token')
    if (storedToken) {
      const payload = jwt_decode<GoogleJwtPayload>(storedToken)
      UserDataServer.login(payload, this.game, () => this.onOptionClick())
    }
  }

  // Navigate to the first scene user should see (Home or Tutorial)
  protected startFirstScene(): void {
    // If the last tutorial isn't complete, start the next tutorial
    const missions = UserSettings._get('completedMissions')
    if (!missions[TUTORIAL_LENGTH - 1]) {
      for (let i = 0; i < TUTORIAL_LENGTH; i++) {
        // If this tutorial mission hasn't been completed, jump to that mission
        if (!missions[i]) {
          this.scene.start('TutorialMatchScene', {
            isTutorial: false, // TODO This is old, remove
            deck: undefined,
            mmCode: `ai:t${i}`,
            missionID: i,
          })
          return
        }
      }
    } else {
      this.scene.start('HomeScene')
    }
  }
}

export class PreloadScene extends SigninScene {
  constructor() {
    super({
      key: 'PreloadScene',
    })
  }

  // Load all assets used throughout the game
  preload(): void {
    // Ensure that every user setting is either set, or set it to its default value
    UserSettings._ensure()

    // Ensure that audio plays even when tab loses focus
    this.sound.pauseOnBlur = false

    this.sound.volume = UserSettings._get('volume') * 5

    // Load the assets used in this scene
    Loader.preload(this)
  }

  create() {
    // When loading is complete, if user selected an option, start home screen
    this.load.on('complete', () => {
      if (this.signedInOrGuest) {
        this.startFirstScene()
      }
    })

    // NOTE This does not block and these assets won't be loaded in time for below code
    Loader.loadAll(this)

    super.create()
  }
}
