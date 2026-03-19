import 'phaser'

import { Deck } from '../../../shared/types/deck'
import GameModel from '../../../shared/state/gameModel'

import { server } from '../server'
import { MatchScene, View } from './matchScene'

export class SpectatorMatchScene extends MatchScene {
  constructor(
    args = { key: 'SpectatorMatchScene', lastScene: 'BuilderScene' },
  ) {
    super(args)
  }

  // Whether the player has received a "seed" (The first state seen sent by the server, which might not be the first state if joinging after the game has started)
  private hasSeededInitialVersion: boolean

  init(params: {
    spectateTargetUuid: string
    gameStartState?: GameModel
  }): void {
    this.params = params

    // Reset variables (similar to MatchScene.init, but without sending init messages).
    this.queuedStates = {}
    this.currentVersion = this.maxVersion = -1
    this.hasSeededInitialVersion = false

    // Register each hook for a message from the server.
    this.registerMatchServerHooks()

    // Subscribe first; then create view and seed if we got one.
    server.send({
      type: 'spectatePlayer',
      targetUuid: params.spectateTargetUuid,
    })

    if (params.gameStartState) {
      this.currentVersion = params.gameStartState.versionNo - 1
      this.queueState(params.gameStartState)
    }

    // Create the view in read-only mode.
    this.view = new View(this, 0, '')

    // Hide the searching region immediately so the user can't click Cancel.
    this.view.searching.hide()

    // Callbacks should signal error
    const m = 'You are spectating.'
    this.view.pass.setCallback(() => {
      this.signalError(m)
      return false
    })
    this.view.ourBoard.setCardClickCallback(() => {
      this.signalError(m)
      return false
    })
    this.view.mulligan.setCallback(() => {
      this.signalError(m)
      return false
    })

    // TODO Show the right costs for each card in our hand
    this.view.ourBoard.setDisplayCostCallback(() => {})

    this.paused = false
  }

  queueState(state: GameModel): void {
    if (!this.hasSeededInitialVersion) {
      this.currentVersion = state.versionNo - 1
      this.hasSeededInitialVersion = true
    }
    super.queueState(state)
  }

  protected shouldPass(_state: GameModel): boolean {
    return false
  }

  signalOpponentSurrendered(): void {
    // No popups in spectator mode.
  }

  signalOpponentDisconnect(): void {
    // No popups in spectator mode.
  }

  signalOpponentReconnected(): void {
    // No popups in spectator mode.
  }
}
