import 'phaser'
import { MatchWS, versionNumber } from '../network/net'
// Import Settings itself
import { UserSettings } from '../settings/settings'
import BaseScene from './baseScene'
import Animator from './matchRegions/animator'
import Region from './matchRegions/baseRegion'
import Regions from './matchRegions/matchRegions'
import OverlayRegion from './matchRegions/pileOverlays'
import GameModel from '../../../shared/state/gameModel'

var storyHiddenLock: boolean = false

// TODO Rename to Match
export class GameScene extends BaseScene {
  params: any

  view: View
  net: MatchWS

  // Whether the match is paused (Awaiting user to click a button, for example)
  paused: boolean

  // The states which are queued up and have not yet been seen, with key being their version number
  queuedStates: { [key: number]: GameModel }

  // Recap handling
  queuedRecap: GameModel[] = []
  recapPlaying: boolean // TODO Redundant with above?
  lastRecap: GameModel[]
  currentState: GameModel
  currentVersionNo: number

  // Whether this match is a tutorial
  isTutorial = false

  init(params: any) {
    this.params = params
    // Reset variables
    this.queuedStates = {}
    this.queuedRecap = []
    this.recapPlaying = false
    this.lastRecap = []
    this.currentState = undefined
    this.currentVersionNo = 0

    // TODO Clean this up when a pass is done
    let mmCode = ''
    if (params.mmCode !== undefined) {
      mmCode = params.mmCode
    }

    // Connect with the server
    this.net = new MatchWS(params.deck, this, mmCode, params.avatar)

    // Create the view
    this.view = new View(this, this.params.avatar || 0)

    this.paused = false

    this.setCallbacks(this.view, this.net)
  }

  restart(): void {
    this.view = new View(this, this.params.avatar || 0)
  }

  beforeExit() {
    this.net.exitMatch()
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
  }

  signalDC(): void {
    this.scene.launch('MenuScene', {
      menu: 'disconnect',
      activeScene: this,
    })
  }

  // Set all of the callback functions for the regions in the view
  private setCallbacks(view, net: MatchWS): void {
    let that = this

    // Commands region
    view.commands.recapCallback = () => {
      that.recapPlaying = true
      // that.queuedRecap = [...that.lastRecap]
      // that.queueState(that.currentState)
      // 321
      this.currentVersionNo = Math.max(0, this.currentVersionNo - 10)

      // that.queuedStates
      // versionNumber
    }
    view.commands.skipCallback = () => {
      that.tweens.getTweens().forEach((tween) => {
        tween.complete()
      })

      // Set variables to a state where a recap isn't playing
      that.queuedRecap = []
      that.recapPlaying = false

      // End the pause
      that.paused = false

      // that.currentVersionNo = versionNumber
    }

    // Hand region
    view.ourHand.setCardClickCallback((i: number) => {
      net.playCard(i)
    })
    view.ourHand.setDisplayCostCallback((cost: number) => {
      that.view.ourScore.displayCost(cost)
    })
    view.ourHand.setEmoteCallback(() => {
      this.net.signalEmote()
    })

    // Set the callbacks for overlays
    view.ourHand.setOverlayCallbacks(
      () => {
        this.view.showOverlay(this.view.ourDeckOverlay)
      },
      () => {
        this.view.showOverlay(this.view.ourDiscardOverlay)
      },
    )

    view.theirHand.setOverlayCallbacks(
      () => {
        this.view.showOverlay(this.view.theirDeckOverlay)
      },
      () => {
        this.view.showOverlay(this.view.theirDiscardOverlay)
      },
    )

    // Buttons TODO Rework these
    // view.ourButtons.setRecapCallback(() => {
    // 	that.recapPlaying = true
    // 	that.queuedRecap = [...that.lastRecap]
    // 	that.queueState(that.currentState)
    // })

    // view.ourButtons.setPassCallback(() => {
    // 	net.playCard(10)
    // })

    // view.ourButtons.setSkipCallback(() => {
    // 	that.tweens.getTweens().forEach((tween) => {
    // 		tween.complete()
    // 	})

    // 	// Set variables to a state where a recap isn't playing
    // 	that.queuedRecap = []
    // 	that.recapPlaying = false
    // 	that.view.paused = false
    // })
    // view.ourButtons.setPlayCallback(() => {that.view.paused = false})
    // view.ourButtons.setPauseCallback(() => {that.view.paused = true})

    // Story
    view.story.setCallback((i: number) => {
      return function () {
        // Get the series of states for this recap starting from the given index
        let recap = that.lastRecap.slice(i)

        // Set that a recap is playing, queue the correct recap
        that.recapPlaying = true
        that.queuedRecap = recap

        // To correctly display point changes, set the current scores to the last recaps totals
        // that.lastScore = that.lastRecap[i].score TODO

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
        net.playCard(10)
      }
    })
    view.pass.setShowResultsCallback(() => {
      that.view.results.show()
    })

    // Piles (Show overlay when clicked)
    view.decks.setCallback(
      () => {
        that.view.ourDeckOverlay.show()
      },
      () => {
        that.view.theirDeckOverlay.show()
      },
    )

    view.discardPiles.setCallback(
      () => {
        that.view.ourDiscardOverlay.show()
      },
      () => {
        that.view.theirDiscardOverlay.show()
      },
    )

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

    if (this.currentVersionNo in this.queuedStates) {
      let isDisplayed = this.displayState(
        this.queuedStates[this.currentVersionNo],
      )

      // If the state was just shown, delete it
      if (isDisplayed) {
        this.currentState = this.queuedStates[this.currentVersionNo]
        this.currentVersionNo++
        // delete this.queuedStates[nextVersionNumber]
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

    // Remember what version of the game state this is, for use when communicating with server
    this.net.setVersionNumber(state.versionNo)

    this.view.displayState(state)

    // Autopass
    if (this.shouldPass(state)) {
      this.net.passTurn()
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
    this.view.theirHand['emote'](emoteNumber)
  }
}

// The View of MVC - What is presented to the user
export class View {
  scene: BaseScene

  searching: Region

  // The buttons below Options button
  commands: Region

  ourHand: Region
  // ourButtons: Region
  theirHand: Region
  story: Region
  ourScore
  theirScore: Region
  decks: Region
  discardPiles: Region
  pass: Region
  scores: Region

  ourDeckOverlay: OverlayRegion
  theirDeckOverlay: OverlayRegion
  ourDiscardOverlay: OverlayRegion
  theirDiscardOverlay: OverlayRegion
  ourExpendedOverlay: OverlayRegion
  theirExpendedOverlay: OverlayRegion

  // Region shown during mulligan phase
  mulligan: Region

  // Region shown when the game has been won / lost
  results: Region

  // Class that animates everything that is animated
  animator: Animator

  constructor(scene: BaseScene, avatarId: number) {
    this.scene = scene

    let background = scene.add
      .image(0, 0, 'bg-Match')
      .setOrigin(0)
      .setDepth(-1)
      // Hovering this will hide the hint, in case it lingers from a state change
      .setInteractive()
      .on('pointerover', () => {
        this.scene.hint.hide()
      })

    this.searching = new Regions.Searching().create(scene, avatarId)

    this.commands = new Regions.Commands().create(scene)

    // Create each of the regions
    // this.createOurHand()
    // new HandRegion()//.create(scene)
    this.ourHand = new Regions.OurHand().create(scene, avatarId)
    this.theirHand = new Regions.TheirHand().create(scene)

    this.story = new Regions.Story().create(scene)
    this.ourScore = new Regions.OurScore().create(scene)
    this.theirScore = new Regions.TheirScore().create(scene)
    // this.ourButtons = new Regions.OurButtons().create(scene)

    this.decks = new Regions.Decks().create(scene)
    this.discardPiles = new Regions.DiscardPiles().create(scene)
    this.pass = new Regions.Pass().create(scene)
    this.scores = new Regions.RoundResult().create(scene)

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
  }

  displayState(state: GameModel) {
    this.searching.hide()

    this.mulligan.displayState(state)
    this.commands.displayState(state)

    this.ourHand.displayState(state)
    this.theirHand.displayState(state)
    this.story.displayState(state)
    this.ourScore.displayState(state)
    this.theirScore.displayState(state)
    // this.ourButtons.displayState(state)
    this.decks.displayState(state)
    this.discardPiles.displayState(state)
    this.pass.displayState(state)
    this.scores.displayState(state)

    this.ourDeckOverlay.displayState(state)
    this.theirDeckOverlay.displayState(state)
    this.ourDiscardOverlay.displayState(state)
    this.theirDiscardOverlay.displayState(state)
    this.ourExpendedOverlay.displayState(state)
    this.theirExpendedOverlay.displayState(state)

    this.results.displayState(state)

    // Animate the state
    this.animator.animate(state)

    // Play whatever sound this new state brings
    if (state.sound !== null) {
      this.scene.playSound(state.sound)
    }
  }

  // Show the given overlay and hide all others
  showOverlay(overlay: OverlayRegion): void {
    // Hide the hint, in case it's describing something now moot
    this.scene.hint.hide()

    // Hide all overlays
    this.ourDeckOverlay.hide()
    this.theirDeckOverlay.hide()
    this.ourDiscardOverlay.hide()
    this.theirDiscardOverlay.hide()
    this.ourExpendedOverlay.hide()
    this.theirExpendedOverlay.hide()

    // Show the given overlay
    overlay.show()
  }
}

export class StandardGameScene extends GameScene {
  constructor(args = { key: 'StandardGameScene', lastScene: 'BuilderScene' }) {
    super(args)
  }

  signalMatchFound(): void {
    this.view.searching.displayState(undefined)
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

    // Must be reset each time it this scene is run
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

  signalMatchFound(): void {}

  private unlockMissionRewards(): void {
    // Set that user has completed the missions with this id
    if (this.params.missionID !== undefined) {
      UserSettings._setIndex('completedMissions', this.params.missionID, true)
    }
  }
}
