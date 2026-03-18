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

  init(params: {
    deck?: Deck
    spectateTargetUuid: string
    gameStartState?: GameModel
  }): void {
    this.params = params

    // Reset variables (similar to MatchScene.init, but without sending init messages).
    this.queuedStates = {}
    this.currentVersion = this.maxVersion = -1

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
    this.view = new View(
      this,
      params.deck?.cosmeticSet?.avatar ?? 0,
      '', // Spectators have no password context.
    )

    // Hide the searching region immediately so the user can't click Cancel.
    this.view.searching.hide()

    // Provide no-op callbacks so a spectator can't accidentally trigger actions.
    this.view.pass.setCallback(() => {})
    this.view.pass.setShowResultsCallback(() => {})
    this.view.ourBoard.setCardClickCallback(() => {})
    this.view.ourBoard.setDisplayCostCallback(() => {})

    this.paused = false
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
