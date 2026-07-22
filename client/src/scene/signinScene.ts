import 'phaser'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'
import type { CredentialResponse } from 'google-one-tap'
import Loader from '../loader/loader'
import Server from '../server'
import { server } from '../server'
import { Space, Url, UserSettings, Flags, Style } from '../settings/settings'
import Button from '../lib/buttons/button'
import Buttons from '../lib/buttons/buttons'
import ensureMusic from '../loader/audioManager'
import Cinematic from '../lib/cinematic'
import { TUTORIAL_LENGTH } from '@shared/settings'

// How long to wait for server before saying it's disconnected
const GRACE_PERIOD_TO_CONNECT = 1000
// How long the reconnect message lasts on screen
const RECONNECT_MESSAGE_TIME = 2000

// Scene for user to select a sign in option, without loading assets
export class SigninScene extends Phaser.Scene {
  // Allows for typing objects in RexUI library
  rexUI: RexUIPlugin

  // True when user is signed in or chose to be a guest
  signedInOrGuest: boolean = false
  guestButton?: Button

  // The login and quit buttons exist just on Steam build
  steamLoginButton?: Button
  quitButton?: Button

  private txt: Phaser.GameObjects.Text

  // When the scene started
  private timeSceneStart: number

  constructor(args) {
    super({
      key: args === undefined ? 'SigninScene' : args.key,
    })
  }

  create(): void {
    this.timeSceneStart = Date.now()

    // Clear any session storage (Related to a single page visit, not local storage)
    UserSettings.clearSessionStorage()

    // Ensure animation is displayed
    Cinematic.ensure()

    // Add buttons to sign in or play as a guest
    this.createButtons()

    // Electron + Steam login path
    if (Flags.isElectronBuild()) {
      // Auto sign-in from the Steam session; show the login button if there's
      // none or it fails.
      Server.loginSteam(this.game, () => this.onOptionClick())
        .then((started) => {
          if (!started) this.showSteamLoginButton()
        })
        .catch((e) => {
          console.error('Steam login failed:', e)
          this.showSteamLoginButton()
        })
    } else {
      const sessionToken = localStorage.getItem(Url.session_token)

      // Auto sign-in only from a durable session token. We never replay a
      // stored Google credential — it expires after ~1 hour, and a fresh one is
      // issued by Google Identity Services (auto-select) on page load.
      if (sessionToken !== null) {
        Server.loginWithSession(sessionToken, this.game, () =>
          this.onOptionClick(),
        )

        // Show the guest button when menu closes (If user is in registering username step of the account registration flow)
        this.events.on('showGuestButton', () => {
          this.guestButton?.setVisible(true)
        })
      } else {
        // Show the GSI button
        document.getElementById('signin').hidden = false

        // Hide the loading text
        this.removeLoadingText()
      }
    }

    // Text describing anything going on
    this.txt = this.add.text(0, 0, '', Style.header).setOrigin(0.5)
    this.plugins.get('rexAnchor')['add'](this.txt, { x: '50%', y: '50%' })
  }

  // Signal to user any disconnections or attempts to reconnect
  update(time: number, delta: number): void {
    super.update(time, delta)

    // Check server connection status
    if (
      server &&
      !server.isOpen() &&
      Date.now() - this.timeSceneStart > GRACE_PERIOD_TO_CONNECT
    ) {
      // A disconnect message here was removed because it flickered on during
      // the first-registration step; keep the line blank while disconnected.
      this.txt.setText('')
    } else if (Server.pendingReconnect) {
      this.txt.setText('Reconnecting to match...')
    } else {
      this.txt.setText('')
    }
  }

  // Create buttons for each of the signin options (Guest, OAuth)
  private createButtons(): void {
    // Steam buttons
    if (Flags.isElectronBuild()) {
      this.createSteamLoginButton()
      const quitButtonContainer = this.add.container()
      this.quitButton = new Buttons.Basic({
        within: quitButtonContainer,
        text: 'Quit Game',
        f: () => {
          ;(window as any).electronAPI.quit()
        },
        depth: -1,
      })

      // Tucked in the bottom-right corner, clear of the centered Loading text
      // and the login button
      this.plugins.get('rexAnchor')['add'](quitButtonContainer, {
        x: `100%-${Space.pad + Space.buttonWidth / 2}`,
        y: `100%-${Space.pad + Space.buttonHeight / 2}`,
      })
      return
    }

    // Normal button
    const guestButtonContainer = this.add.container()
    this.guestButton = new Buttons.Basic({
      within: guestButtonContainer,
      text: 'Guest',
      f: () => {
        this.scene.launch('MenuScene', {
          menu: 'confirm',
          text: 'Guest accounts have limited features. Sign in with Google to access additional features.',
          hint: 'Play as Guest',
          callback: () => {
            Server.loginGuest(this.game, () => this.onOptionClick())
          },
        })
      },
      muteClick: true,
      depth: -1,
    })

    // If signing in with a session token, hide this
    this.guestButton.setVisible(
      localStorage.getItem(Url.session_token) === null,
    )

    this.plugins.get('rexAnchor')['add'](guestButtonContainer, {
      x: `50%`,
      y: `100%-${Space.pad + Space.buttonHeight / 2}`,
    })

    this.createGoogleGSIButton()
  }

  /** Electron only: retry Steam login without a confirmation dialog. */
  private createSteamLoginButton(): void {
    const container = this.add.container()
    this.steamLoginButton = new Buttons.Basic({
      within: container,
      text: 'Login',
      f: () => {
        console.log('Logging in with Steam')
        Server.loginSteam(this.game, () => this.onOptionClick()).catch((e) =>
          console.error('Steam login failed:', e),
        )
      },
      muteClick: true,
      depth: -1,
    })

    // Hidden unless the Steam auto-login fails
    this.steamLoginButton.setVisible(false)

    this.plugins.get('rexAnchor')['add'](container, {
      x: `50%`,
      y: `100%-${Space.pad + Space.buttonHeight / 2}`,
    })
  }

  // Show the login button and hide the loading text
  private showSteamLoginButton(): void {
    this.steamLoginButton?.setVisible(true)
    this.removeLoadingText()
  }

  private onOptionClick(): void {
    this.signedInOrGuest = true

    // Make the buttons unclickable
    this.guestButton?.disable()
    this.steamLoginButton?.disable()
    document.getElementById('signin').hidden = true

    // Ensure that music is playing
    ensureMusic(this)

    // If loading is already complete, start the first scene
    if (!this.load.isLoading()) {
      this.startFirstScene()
    }
  }

  private createGoogleGSIButton(): void {
    google.accounts.id.initialize({
      client_id: Url.oauth,
      ux_mode: 'popup',
      auto_select: true,
      callback: (token: CredentialResponse) => {
        // Auto-select may fire this even though a session login already
        // connected us — don't open a redundant second connection.
        if (this.signedInOrGuest) return

        // Send the raw credential; the server verifies it and returns a durable
        // session token (persisted by the sessionToken handler). The Google
        // credential itself is ephemeral and intentionally not stored.
        Server.login(token.credential, this.game, () => this.onOptionClick())
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
    this.removeLoadingText()

    // Check if there's a pending reconnect - if so, let the "Reconnecting..."
    // message linger for a constant time, then start the match scene
    if (Server.pendingReconnect) {
      setTimeout(
        () => Server.startPendingReconnect(this),
        RECONNECT_MESSAGE_TIME,
      )
      return
    }

    // If tutorials aren't all finished, go to the opening cinematic
    const missions = UserSettings._get('completedMissions')
    if (!missions[TUTORIAL_LENGTH - 1]) {
      this.scene.start('OpeningScene')
      return
    }

    // Otherwise (Standard case), go to the home screen
    this.scene.start('HomeScene')
  }

  private removeLoadingText(): void {
    const loadingEl = document.getElementById('loading-text')
    if (loadingEl) loadingEl.style.display = 'none'
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
    // Ensure that user settings are all set, or set them to their default value
    UserSettings._ensure()

    // Ensure that audio plays even when tab loses focus
    this.sound.pauseOnBlur = false

    this.sound.volume = UserSettings._get('volume') * 5

    // Load the assets used in this scene
    Loader.preload(this)
  }

  create() {
    // Timestamp the start of asset loading so we can report its duration.
    const loadStart = performance.now()

    // When loading is complete, if user selected an option, start home screen
    this.load.on('complete', () => {
      // Report how long loading all assets took (server console log)
      const loadMs = Math.round(performance.now() - loadStart)
      Server.reportLoadTime(loadMs)

      if (this.signedInOrGuest) {
        this.startFirstScene()
      }
    })

    // NOTE This does not block and these assets won't be loaded in time for the below code
    Loader.loadAll(this)

    super.create()
  }
}
