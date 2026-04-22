import 'phaser'
// Import Settings itself
import { UserSettings, Messages } from '../settings/settings'
import BaseScene from './baseScene'
import Animator from './matchRegions/animator'
import Region from './matchRegions/baseRegion'
import Regions from './matchRegions/matchRegions'
import OverlayRegion from './matchRegions/pileOverlayRegions'
import GameModel from '../../../shared/state/gameModel'
import { SoundEffect } from '../../../shared/state/soundEffect'
import PassRegion from './matchRegions/passRegion'
import { Deck } from '../../../shared/types/deck'
import Server from '../server'
import TheirAvatarRegion from './matchRegions/theirAvatarRegion'
import OurAvatarRegion from './matchRegions/ourAvatarRegion'
import OurBoardRegion from './matchRegions/ourBoardRegion'
import OurStacksRegion from './matchRegions/ourStacksRegion'
import TheirBoardRegion from './matchRegions/theirBoardRegion'
import TheirStacksRegion from './matchRegions/theirStacksRegion'
import StoryRegion from './matchRegions/storyRegion'
import MulliganRegion from './matchRegions/mulliganRegion'
import WinsRegion from './matchRegions/scoreRegion'
import WinsChromeRegion from './matchRegions/winsChromeRegion'
import BackgroundRegion from './matchRegions/backgroundRegion'
import BreathRegion from './matchRegions/breathRegion'
import HistoryRegion from './matchRegions/historyRegion'
import StatusRegion from './matchRegions/statusRegion'

// TODO Figure out
import { server } from '../server'
import { ClientWS } from '../../../shared/network/celestialTypedWebsocket'
import logEvent from '../utils/analytics'

export class MatchScene extends BaseScene {
  params: any

  view: View
  ws: ClientWS

  // Whether the match is paused (Awaiting user to click a button, for example)
  paused: boolean

  // Version numbers of currently displayed and most recent states
  currentVersion: number
  maxVersion: number
  // The states which are queued up, with key being their version number
  queuedStates: { [key: number]: GameModel }

  // Whether this match is a tutorial
  isTutorial = false

  init(params: {
    deck?: Deck
    missionID?: number
    missionCards?: number[]
    isPvp?: boolean
    password?: string
    aiDeck?: Deck
    gameStartState?: GameModel
    enabledModes?: number[]
  }) {
    this.params = params
    // Reset variables
    this.queuedStates = {}
    this.currentVersion = this.maxVersion = -1

    // Register each hook for a message from the server
    this.registerMatchServerHooks()

    // Send initial message to the server, unless we're reconnecting
    if (this.params.gameStartState) {
      this.currentVersion = this.params.gameStartState.versionNo - 1
      this.queueState(this.params.gameStartState)
    } else if (this.isTutorial) {
      logEvent(`Start tutorial ${params.missionID + 1}`)

      server.send({
        type: 'initTutorial',
        num: params.missionID,
        uuid: Server.getUserData().uuid,
      })
    } else if (params.isPvp) {
      server.send({
        type: 'initPvp',
        password: params.password,
        uuid: Server.getUserData().uuid,
        deck: params.deck,
      })
    } else if (params.enabledModes) {
      server.send({
        type: 'initSpecialPve',
        aiDeck: params.aiDeck,
        uuid: Server.getUserData().uuid,
        deck: params.deck,
        enabledModes: params.enabledModes,
      })
    } else {
      if (params.missionID !== undefined) {
        server.send({
          type: 'initMission',
          uuid: Server.getUserData().uuid,
          deck: params.deck,
          missionID: params.missionID,
        })
      } else {
        server.send({
          type: 'initPve',
          aiDeck: params.aiDeck,
          uuid: Server.getUserData().uuid,
          deck: params.deck,
        })
      }
    }

    // Create the view
    this.view = new View(
      this,
      this.params.deck?.cosmeticSet?.avatar ?? 0,
      this.params.password,
    )

    this.paused = false

    this.setCallbacks(this.view)
  }

  restart(): void {
    this.view = new View(
      this,
      this.params.deck?.cosmeticSet?.avatar ?? 0,
      this.params.password,
    )
  }

  beforeExit(): void {
    this.view.beforeExit()
  }

  // Listens for websocket updates
  // Manages user decisions (What card to play, when to pass)

  // Methods called by the websocket

  // Queue up the given state, to be displayed when correct to do so
  queueState(state: GameModel): void {
    // If a state with this version isn't in the queued states, add it
    if (!(state.versionNo in this.queuedStates)) {
      this.queuedStates[state.versionNo] = state
    }

    this.maxVersion = Math.max(this.maxVersion, state.versionNo)
  }

  /** Complete every active tween on this scene. */
  protected completeAllSceneTweens(): void {
    const list = this.tweens.getTweens()
    for (let i = list.length - 1; i >= 0; i--) {
      list[i].complete()
    }
  }

  /**
   * Advance recap playback to the next live match state (exit the replay stream).
   * If that state is not in the buffer yet, jump to the newest buffered frame instead.
   */
  protected seekQueuedStateAfterRecap(): void {
    this.completeAllSceneTweens()
    let v = this.currentVersion + 1
    while (
      v <= this.maxVersion &&
      this.queuedStates[v] &&
      this.queuedStates[v].isRecap
    ) {
      v++
    }
    if (
      v <= this.maxVersion &&
      this.queuedStates[v] &&
      !this.queuedStates[v].isRecap
    ) {
      this.currentVersion = v - 1
    } else if (this.maxVersion > this.currentVersion) {
      this.currentVersion = this.maxVersion - 1
    }
  }

  /**
   * Last `versionNo` in the consecutive recap run starting at `currentVersion + 1`,
   * or null if the next queued state is not recap.
   */
  protected getLastRecapVersionAhead(): number | null {
    let v = this.currentVersion + 1
    let lastRecapV = -1
    while (
      v <= this.maxVersion &&
      this.queuedStates[v] &&
      this.queuedStates[v].isRecap
    ) {
      lastRecapV = v
      v++
    }
    return lastRecapV >= 0 ? lastRecapV : null
  }

  /** Jump to the last buffered recap frame in the current forward recap run (still in recap). */
  protected seekToLastRecapState(): void {
    this.completeAllSceneTweens()
    const L = this.getLastRecapVersionAhead()
    if (L !== null) {
      this.currentVersion = L - 1
    }
  }

  private signalOpponentSurrendered(): void {
    this.scene.launch('MenuScene', {
      menu: 'message',
      title: 'Opponent Surrendered',
      s: 'Your opponent surrendered, you win!',
    })
  }

  private signalOpponentDisconnect(): void {
    this.scene.launch('MenuScene', {
      menu: 'message',
      title: 'Opponent Disconnected',
      s: 'Your opponent disconnected, now we wait for them to reconnect...',
    })
  }

  private signalOpponentReconnected(): void {
    this.scene.launch('MenuScene', {
      menu: 'message',
      title: 'Opponent Reconnected',
      s: 'Your opponent has reconnected, resuming the game.',
    })
  }

  // Set all of the callback functions for the regions in the view
  private setCallbacks(view): void {
    // Callbacks in this and spectator modes
    this.setCommonCallbacks(view)

    // Hand region
    view.ourBoard.setCardClickCallback((i: number) => {
      server.send({
        type: 'playCard',
        cardNum: i,
        versionNo: this.currentVersion,
      })
      return true
    })
    view.ourAvatar.setEmoteCallback(() => {
      server.send({
        type: 'emote',
      })
    })

    // Story
    view.story.setCallback((i: number) => {
      return () => {
        this.completeAllSceneTweens()
        this.paused = false
      }
    })

    // Pass button
    view.pass.setCallback(() => {
      if (!this.paused) {
        server.send({
          type: 'passTurn',
          versionNo: this.currentVersion,
        })
        return true
      }
      return false
    })

    // Mulligan
    view.mulligan.setCallback(() => {
      if (!server.isOpen()) {
        this.signalError(Messages.disconnectError)
        return
      }

      // Get the choice and send to server
      const choice: [boolean, boolean, boolean] = view.mulligan.mulliganChoices
      server.send({
        type: 'mulligan',
        mulligan: choice,
      })
    })
  }

  protected setCommonCallbacks(view: View): void {
    // Set the callbacks for overlays (count icons sit on the pile stacks)
    view.ourStacks.setOverlayCallbacks(
      () => {
        this.view.showOverlay(this.view.ourDeckOverlay)
      },
      () => {
        this.view.showOverlay(this.view.ourDiscardOverlay)
      },
    )

    view.theirStacks.setOverlayCallbacks(
      () => {
        this.view.showOverlay(this.view.theirDeckOverlay)
      },
      () => {
        this.view.showOverlay(this.view.theirDiscardOverlay)
      },
    )

    // Watch recap (resolution of last story)
    view.historyRegion.recapCallback = () => {
      this.completeAllSceneTweens()
      this.paused = false
      // Scan backwards through the queued states to find the start of the recap
      for (let version = this.currentVersion - 1; version >= 0; version--) {
        if (this.queuedStates[version] && this.queuedStates[version].isRecap) {
          // Continue backwards until we find where isRecap is false
          while (version >= 0 && this.queuedStates[version].isRecap) {
            version--
          }
          this.currentVersion = version
          break
        }
      }
    }

    // Moon during recap: if more recap remains after the next frame, jump to the last recap
    // frame; if the next frame is already the last recap (or only recap), exit to live.
    const moonRecapNavigation = () => {
      this.paused = false
      const L = this.getLastRecapVersionAhead()
      if (L === null) {
        this.seekQueuedStateAfterRecap()
        return
      }
      const nextV = this.currentVersion + 1
      if (nextV < L) {
        this.seekToLastRecapState()
      } else {
        this.seekQueuedStateAfterRecap()
      }
    }

    view.pass.skipCallback = moonRecapNavigation

    // Display the cost of each card in our hand
    view.ourBoard.setDisplayCostCallback((cost: number) => {
      this.view.breathRegion.displayCost(cost)
    })

    // For showing the results after match is over
    view.pass.setShowResultsCallback(() => {
      if (!this.view.results.isVisible()) {
        this.view.results.show()
      } else {
        this.view.results.hide()
      }
    })
  }

  // Try to display the next queued state TODO Recovery if we've been waiting too long
  update(time, delta): void {
    super.update(time, delta)

    // Enable the searching region visual update
    this.view.searching.update(time, delta)

    if (this.currentVersion + 1 in this.queuedStates) {
      let isDisplayed = this.displayState(
        this.queuedStates[this.currentVersion + 1],
      )

      // If the state was just shown, delete it
      if (isDisplayed) {
        this.currentVersion++
      }
    }

    // After layout/state so backdrop pulse/drift wins the frame (and stays above night layer in z-order).
    this.view.backgroundRegion.update(time, delta)
  }

  // Display the given game state, returns false if the state isn't shown immediately
  protected displayState(state: GameModel): boolean {
    // If any tweens are playing, don't display yet
    let anyTweenPlaying = this.tweens.getTweens().length > 0
    if (anyTweenPlaying) {
      return false
    }

    if (this.paused) {
      return false
    }

    this.view.displayState(state)

    // Autopass
    if (this.shouldPass(state)) {
      server.send({
        type: 'passTurn',
        versionNo: state.versionNo,
      })
    }

    if (
      state.isRecap &&
      (state.sound === SoundEffect.Win ||
        state.sound === SoundEffect.Lose ||
        state.sound === SoundEffect.Tie)
    ) {
      this.paused = true
    }

    return true
  }

  // Return if the user should pass automatically, based on the game state and their settings
  protected shouldPass(state: GameModel): boolean {
    // Don't pass if mulligans aren't complete
    if (state.mulligansComplete.includes(false)) {
      return false
    }

    // Don't pass during a recap
    if (state.isRecap) {
      return false
    }

    // Don't pass when we don't have priority
    if (state.priority !== 0) {
      return false
    }

    // Pass if we have no cards to play
    let haveNoCards = state.hand.length === 0
    if (haveNoCards) {
      return true
    }

    // If autopass is off, don't pass unless this is a tutorial
    if (!UserSettings._get('autopass') && !this.isTutorial) {
      return false
    }
    // Otherwise, pass only if we have no playable cards
    else {
      let havePlayableCards = state.cardCosts.some(
        (cost) => cost <= state.breath[0],
      )
      return !havePlayableCards
    }
  }

  // Opponent has used a given emote
  emote(emoteNumber: number): void {
    this.view.theirAvatar.emote(emoteNumber)
  }

  protected registerMatchServerHooks(): void {
    // Each registered event
    server
      .on('transmitState', (data) => {
        this.queueState(data.state)
      })
      .on('signalError', () => {
        this.signalError('Server says that an action was in error.')
        console.log('Server says that an action was in error.')
      })
      .on('spectatorJoined', ({ username }) => {
        this.signalError(`${username} began spectating.`)
      })
      .on('opponentSurrendered', () => {
        this.signalOpponentSurrendered()
      })
      .on('opponentDisconnected', () => {
        this.signalOpponentDisconnect()
      })
      .on('opponentReconnected', () => {
        this.signalOpponentReconnected()
      })
      .on('opponentEmote', (data) => {
        this.emote(0)
      })
  }

  onWindowResize(): void {
    this.view.ourStacks.onWindowResize()
    this.view.ourBoard.onWindowResize()
    this.view.theirStacks.onWindowResize()
    this.view.theirBoard.onWindowResize()
  }
}

// The View of MVC - What is presented to the user
export class View {
  scene: BaseScene

  searching: Region

  story: StoryRegion
  pass: PassRegion
  scores: Region

  theirAvatar: TheirAvatarRegion
  ourAvatar: OurAvatarRegion

  ourBoard: OurBoardRegion
  ourStacks: OurStacksRegion
  theirBoard: TheirBoardRegion
  theirStacks: TheirStacksRegion

  breathRegion: BreathRegion
  wins: WinsRegion
  winsChromeRegion: WinsChromeRegion
  historyRegion: HistoryRegion

  // Overlays
  ourDeckOverlay: OverlayRegion
  theirDeckOverlay: OverlayRegion
  ourDiscardOverlay: OverlayRegion
  theirDiscardOverlay: OverlayRegion
  ourExpendedOverlay: OverlayRegion
  theirExpendedOverlay: OverlayRegion

  // Region shown during mulligan phase
  mulligan: MulliganRegion

  // Region shown when the game has been won / lost
  results: Region

  // Class that animates everything that is animated
  animator: Animator

  backgroundRegion: BackgroundRegion
  statusRegion: StatusRegion

  constructor(scene: MatchScene, avatarId: number, password: string) {
    this.scene = scene

    this.backgroundRegion = new Regions.Background().create(scene)

    this.searching = new Regions.Searching().create(scene, avatarId, password)

    // Create each of the regions
    // this.createOurHand()
    // new HandRegion()//.create(scene)
    this.ourBoard = new Regions.OurBoard().create(scene)
    this.ourStacks = new Regions.OurStacks().create(
      scene,
      this.ourBoard.container,
    )
    this.theirBoard = new Regions.TheirBoard().create(scene)
    this.theirStacks = new Regions.TheirStacks().create(
      scene,
      this.theirBoard.container,
    )

    this.statusRegion = new StatusRegion().create(scene)

    this.story = new Regions.Story().create(scene)
    this.breathRegion = new Regions.Breath().create(scene)
    this.winsChromeRegion = new Regions.WinsChrome().create(scene)
    this.wins = new Regions.Wins().create(scene)
    this.historyRegion = new Regions.History().create(scene)
    // this.ourButtons = new Regions.OurButtons().create(scene)

    this.pass = new Regions.Pass().create(scene)
    this.scores = new Regions.RoundResult().create(scene)

    // Avatars
    this.ourAvatar = new Regions.OurAvatar().create(scene)
    this.theirAvatar = new Regions.TheirAvatar().create(scene)

    // Overlays
    this.ourDeckOverlay = new Regions.OurDeck().create(scene)
    this.theirDeckOverlay = new Regions.TheirDeck().create(scene)
    this.ourDiscardOverlay = new Regions.OurDiscard()
      .create(scene)
      .setSwitch(() => {
        this.showOverlay(this.ourExpendedOverlay)
      })
    this.theirDiscardOverlay = new Regions.TheirDiscard()
      .create(scene)
      .setSwitch(() => {
        this.showOverlay(this.theirExpendedOverlay)
      })
    this.ourExpendedOverlay = new Regions.OurExpended()
      .create(scene)
      .setSwitch(() => {
        this.showOverlay(this.ourDiscardOverlay)
      })
    this.theirExpendedOverlay = new Regions.TheirExpended()
      .create(scene)
      .setSwitch(() => {
        this.showOverlay(this.theirDiscardOverlay)
      })

    // These regions are only visible during certain times
    this.mulligan = new Regions.Mulligan().create(scene)

    this.results = new Regions.MatchResults().create(scene)

    this.animator = new Animator(scene, this)
  }

  displayState(state: GameModel) {
    this.searching.hide()

    this.mulligan.displayState(state)

    this.theirAvatar.displayState(state)
    this.ourAvatar.displayState(state)

    this.statusRegion.displayState(state)

    this.ourStacks.displayState(state)
    this.ourBoard.displayState(state)

    this.theirStacks.displayState(state)
    this.theirBoard.displayState(state)

    this.breathRegion.displayState(state)
    this.winsChromeRegion.displayState(state)
    this.wins.displayState(state)
    this.historyRegion.displayState(state)

    this.story.displayState(state)
    this.pass.displayState(state)
    this.scores.displayState(state)

    // Overlays
    this.ourDeckOverlay.displayState(state)
    this.theirDeckOverlay.displayState(state)
    this.ourDiscardOverlay.displayState(state)
    this.theirDiscardOverlay.displayState(state)
    this.ourExpendedOverlay.displayState(state)
    this.theirExpendedOverlay.displayState(state)

    // Result of the game ending
    this.results.displayState(state)

    // Animate the state
    this.animator.animate(state)

    // Play the sound
    if (state.sound) {
      this.scene.playSound(state.sound)
    }

    this.backgroundRegion.tweenTintForRecap(state.isRecap)
  }

  // Show the given overlay and hide all others
  showOverlay(overlay: OverlayRegion): void {
    // Hide the hint, in case it's describing something now moot
    this.scene.hint.hide()

    // Note whether the overlay is already visible
    const alreadyVisible = overlay.container.visible

    // Hide all overlays
    this.ourDeckOverlay.hide()
    this.theirDeckOverlay.hide()
    this.ourDiscardOverlay.hide()
    this.theirDiscardOverlay.hide()
    this.ourExpendedOverlay.hide()
    this.theirExpendedOverlay.hide()

    // Show the given overlay
    if (!alreadyVisible) {
      overlay.show()
    }
  }

  beforeExit(): void {
    this.searching.beforeExit()
  }
}

export class StandardMatchScene extends MatchScene {
  constructor(args = { key: 'StandardMatchScene', lastScene: 'BuilderScene' }) {
    super(args)
  }

  doExit(): () => void {
    return () => {
      this.beforeExit()
      this.scene.start('BuilderScene')
    }
  }
}

// TODO Consider removing this if it's not adding anything
export class JourneyMatchScene extends MatchScene {
  constructor(args = { key: 'JourneyMatchScene', lastScene: 'JourneyScene' }) {
    super(args)
  }

  doExit(): () => void {
    return () => {
      this.doBack()
    }
  }
}

export class RaceMatchScene extends MatchScene {
  constructor(args = { key: 'RaceMatchScene', lastScene: 'RaceScene' }) {
    super(args)
  }

  doExit(): () => void {
    return () => {
      this.doBack()
    }
  }
}
