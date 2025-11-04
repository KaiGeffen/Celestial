import 'phaser'
import jwt_decode from 'jwt-decode'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'
import type { CredentialResponse } from 'google-one-tap'
import type { GoogleJwtPayload } from '../types/google'
import Loader from '../loader/loader'
import Server from '../server'
import { Space, Url, UserSettings, Flags } from '../settings/settings'
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
    // Clear any session storage (Related to a single page visit, not local storage)
    UserSettings.clearSessionStorage()

    // Ensure animation is displayed
    Cinematic.ensure()

    // If user is signed in with OAuth, log them in
    const storedToken = localStorage.getItem(Url.gsi_token)
    if (storedToken !== null) {
      const payload = jwt_decode<GoogleJwtPayload>(storedToken)
      Server.login(payload, this.game, () => this.onOptionClick())
    }
    // If user is not signed in, show gsi and guest button
    else {
      // Sign in is visible on this page, hidden on all other pages
      document.getElementById('signin').hidden = false
      this.events.on('shutdown', () => {
        document.getElementById('signin').hidden = true
      })

      // Add buttons to sign in or play as a guest
      this.createButtons()
    }
  }

  // Create buttons for each of the signin options (Guest, OAuth)
  private createButtons(): void {
    const guestButtonContainer = this.add.container()
    this.guestButton = new Buttons.Basic({
      within: guestButtonContainer,
      text: 'Guest',
      f: () => {
        // Log in as guest
        Server.loginGuest(this.game, () => this.onOptionClick())
      },
      depth: -1,
    })
      // Hide the guest button if user is already signed in
      .setVisible(localStorage.getItem(Url.gsi_token) === null)

    this.plugins.get('rexAnchor')['add'](guestButtonContainer, {
      x: `50%`,
      y: `100%-${Space.pad + Space.buttonHeight / 2}`,
    })

    this.createGoogleGSIButton()
  }

  private onOptionClick(): void {
    this.signedInOrGuest = true

    // Make the buttons unclickable
    if (this.guestButton) {
      this.guestButton.disable()
    }
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
        localStorage.setItem(Url.gsi_token, token.credential)

        const payload = jwt_decode<GoogleJwtPayload>(token.credential)

        // Send jti to confirm connection. After server responds, complete login
        Server.login(payload, this.game, () => this.onOptionClick())
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
  }

  // Navigate to the first scene user sees (Home, tutorial, or reconnect to a match)
  protected startFirstScene(): void {
    // Check if there's a pending reconnect - if so, start the match scene
    const reconnect = Server.getPendingReconnect()
    if (reconnect) {
      this.scene.start('StandardMatchScene', {
        isPvp: true,
        deck: [],
        aiDeck: [],
        gameStartState: reconnect.state,
      })
      return
    }

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

    if (Flags.online) {
      // Gain access to chart plugin for premade decks
      this.load.script(
        'chartjs',
        'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.8.0/chart.min.js',
      )
    }
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
