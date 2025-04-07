import 'phaser'
import {
  MatchWS,
  MatchPveWS,
  MatchPvpWS,
  MatchTutorialWS,
} from '../network/net'
// Import Settings itself
import { UserSettings } from '../settings/settings'
import BaseScene from './baseScene'
import Animator from './matchRegions/animator'
import Region from './matchRegions/baseRegion'
import Regions from './matchRegions/matchRegions'
import OverlayRegion from './matchRegions/pileOverlays'
import GameModel from '../../../shared/state/gameModel'
import PassRegion from './matchRegions/pass'
import { Deck } from '../../../shared/types/deck'
import UserDataServer from '../network/userDataServer'
import TheirAvatarRegion from './matchRegions/theirAvatar'
import OurAvatarRegion from './matchRegions/ourAvatar'
import TheirScoreRegion from './matchRegions/theirScore'
import OurBoardRegion from './matchRegions/ourBoard'
import TheirBoardRegion from './matchRegions/theirBoard'
import StoryRegion from './matchRegions/story'
import OurScoreRegion from './matchRegions/ourScore'
import MulliganRegion from './matchRegions/mulliganRegion'
import CompanionRegion from './matchRegions/companion'

// TODO Rename to Match
export class GameScene extends BaseScene {
  params: any

  view: View
  net: MatchWS

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
    isPvp?: boolean
    password?: string
    aiDeck?: Deck
  }) {
    this.params = params
    // Reset variables
    this.queuedStates = {}
    this.currentVersion = this.maxVersion = -1

    // Connect with the server
    if (this.isTutorial) {
      this.net = new MatchTutorialWS(this, params.missionID)
    } else if (params.isPvp) {
      this.net = new MatchPvpWS(this, params.deck, params.password)
    } else {
      this.net = new MatchPveWS(this, params.deck, params.aiDeck)
    }

    // Create the view
    this.view = new View(this, this.params.deck?.cosmetics?.avatar ?? 0)

    this.paused = false

    this.setCallbacks(this.view, this.net)
  }

  restart(): void {
    this.view = new View(this, this.params.deck?.cosmetics?.avatar ?? 0)
  }

  beforeExit() {
    this.net.exitMatch()
    console.log('About to exit')
    UserDataServer.refreshUserData()
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

  signalDC(): void {
    // Show a message that opponent disconnected
    this.scene.launch('MenuScene', {
      menu: 'message',
      title: 'Opponent Disconnected',
      s: 'Your opponent disconnected, you win!',
    })
  }

  // Signal that a match has been found with given player names
  signalMatchFound(
    name1: string,
    name2: string,
    elo1: number,
    elo2: number,
  ): void {
    console.log('Match found between', name1, 'and', name2)

    this.view.ourAvatar.showUsername(name1, elo1)
    this.view.theirAvatar.showUsername(name2, elo2)
  }

  // Set all of the callback functions for the regions in the view
  private setCallbacks(view, net: MatchWS): void {
    let that = this

    // Their score region
    view.theirScore.recapCallback = () => {
      // Scan backwards through the queued states to find the start of the recap
      for (let version = this.currentVersion - 1; version >= 0; version--) {
        if (this.queuedStates[version] && this.queuedStates[version].isRecap) {
          // Continue backwards until we find where isRecap is false
          while (version >= 0 && this.queuedStates[version].isRecap) {
            version--
          }
          this.currentVersion = version + 1
          break
        }
      }
    }
    view.theirScore.skipCallback = () => {
      that.tweens.getTweens().forEach((tween) => {
        tween.complete()
      })

      // End the pause
      that.paused = false

      that.currentVersion = that.maxVersion - 1
    }

    // Hand region
    view.ourBoard.setCardClickCallback((i: number) => {
      net.playCard(i, this.currentVersion)
    })
    view.ourBoard.setDisplayCostCallback((cost: number) => {
      that.view.ourScore['displayCost'](cost)
    })
    view.ourAvatar.setEmoteCallback(() => {
      this.net.signalEmote()
    })

    // Set the callbacks for overlays
    view.ourAvatar.setOverlayCallbacks(
      () => {
        this.view.showOverlay(this.view.ourDeckOverlay)
      },
      () => {
        this.view.showOverlay(this.view.ourDiscardOverlay)
      },
    )

    view.theirAvatar.setOverlayCallbacks(
      () => {
        this.view.showOverlay(this.view.theirDeckOverlay)
      },
      () => {
        this.view.showOverlay(this.view.theirDiscardOverlay)
      },
    )

    // Buttons TODO Rework these
    // view.ourButtons.setRecapCallback(() => {
    // })

    // view.ourButtons.setPassCallback(() => {
    // 	net.playCard(10)
    // })

    // view.ourButtons.setSkipCallback(() => {
    // 	that.tweens.getTweens().forEach((tween) => {
    // 		tween.complete()
    // 	})

    // 	// Set variables to a state where a recap isn't playing
    // 	that.view.paused = false
    // })
    // view.ourButtons.setPlayCallback(() => {that.view.paused = false})
    // view.ourButtons.setPauseCallback(() => {that.view.paused = true})

    // Story
    view.story.setCallback((i: number) => {
      return function () {
        // Get the series of states for this recap starting from the given index

        // To correctly display point changes, set the current scores to the last recaps totals

        // Skip all tweens playing currently
        // TODO Some text stays enlarged if it doesn't finish
        that.tweens.getTweens().forEach((tween) => {
          tween.complete()
        })

        // TODO Execution of story jumps to the act then stays paused
        that.paused = false
      }
    })

    // Pass button
    view.pass.setCallback(() => {
      if (!this.paused) {
        net.passTurn(this.currentVersion)
      }
    })
    view.pass.setShowResultsCallback(() => {
      if (!that.view.results.isVisible()) {
        that.view.results.show()
      } else {
        that.view.results.hide()
      }
    })

    // Mulligan
    view.mulligan.setCallback(() => {
      const choice: [boolean, boolean, boolean] = view.mulligan.mulliganChoices
      net.doMulligan(choice)
    })

    // Results
    // TODO
  }

  // Try to display the next queued state TODO Recovery if we've been waiting too long
  update(time, delta): void {
    // Enable the searching region visual update
    this.view.searching.update(time, delta)

    // Update pet
    this.view.pet.update(time, delta)

    if (this.currentVersion + 1 in this.queuedStates) {
      let isDisplayed = this.displayState(
        this.queuedStates[this.currentVersion + 1],
      )

      // If the state was just shown, delete it
      if (isDisplayed) {
        this.currentVersion++
      }
    }
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
      this.net.passTurn(state.versionNo)
    }

    // State was displayed
    return true
  }

  // Return if the user should pass automatically, based on the game state and their settings
  private shouldPass(state: GameModel): boolean {
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
  theirBoard: TheirBoardRegion

  ourScore: OurScoreRegion
  theirScore: TheirScoreRegion

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

  pet: CompanionRegion

  constructor(scene: GameScene, avatarId: number) {
    this.scene = scene

    let background = scene.add
      .image(0, 0, 'backgroundMatch')
      .setOrigin(0)
      .setDepth(-1)
      // Hovering this will hide the hint, in case it lingers from a state change
      .setInteractive()
      .on('pointerover', () => {
        this.scene.hint.hide()
      })

    this.searching = new Regions.Searching().create(scene, avatarId)

    // Create each of the regions
    // this.createOurHand()
    // new HandRegion()//.create(scene)
    this.ourBoard = new Regions.OurBoard().create(scene, avatarId)
    this.theirBoard = new Regions.TheirBoard().create(scene)

    this.story = new Regions.Story().create(scene)
    this.ourScore = new Regions.OurScore().create(scene)
    this.theirScore = new Regions.TheirScore().create(scene)
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

    // Results are visible after the game is over
    this.results = new Regions.Results().create(scene)
    this.results.hide()

    this.animator = new Animator(scene, this)

    // Create pet region
    this.pet = new Regions.Companion().create(scene)
  }

  displayState(state: GameModel) {
    this.searching.hide()

    this.mulligan.displayState(state)

    this.theirAvatar.displayState(state)
    this.ourAvatar.displayState(state)

    this.ourBoard.displayState(state)
    this.theirBoard.displayState(state)

    this.ourScore.displayState(state)
    this.theirScore.displayState(state)

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

    // Play whatever sound this new state brings
    if (state.sound !== null) {
      this.scene.playSound(state.sound)
    }

    // Update pet
    this.pet.displayState(state)
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
}

export class StandardGameScene extends GameScene {
  constructor(args = { key: 'StandardGameScene', lastScene: 'BuilderScene' }) {
    super(args)
  }

  signalMatchFound(
    name1: string,
    name2: string,
    elo1: number,
    elo2: number,
  ): void {
    this.view.searching.displayState(undefined)

    super.signalMatchFound(name1, name2, elo1, elo2)
  }
}

export class AdventureGameScene extends GameScene {
  winSeen: boolean

  constructor(
    args = { key: 'AdventureGameScene', lastScene: 'AdventureScene' },
  ) {
    super(args)
  }

  create() {
    super.create()

    // Must be reset each time this scene is run
    this.winSeen = false
  }

  // When the player wins for the first time, unlock appropriately
  queueState(state: GameModel): void {
    if (!this.winSeen && state.winner === 0) {
      this.winSeen = true
      this.unlockMissionRewards()
    }
    super.queueState(state)
  }

  signalMatchFound(
    name1: string,
    name2: string,
    elo1: number,
    elo2: number,
  ): void {}

  private unlockMissionRewards(): void {
    // Set that user has completed the missions with this id
    if (this.params.missionID !== undefined) {
      UserSettings._setIndex('completedMissions', this.params.missionID, true)
    }
  }
}
