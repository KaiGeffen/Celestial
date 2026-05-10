import 'phaser'

import Region from './baseRegion'

import {
  Space,
  Color,
  Style,
  BBStyle,
  Depth,
  Messages,
} from '../../settings/settings'
import Buttons from '../../lib/buttons/buttons'
import GameModel from '../../../../shared/state/gameModel'
import avatarNames from '../../../../shared/data/avatarNames'
import newScrollablePanel from '../../lib/scrollablePanel'
import logEvent from '../../utils/analytics'
import { server } from '../../server'
import { CardImage } from '../../lib/cardImage'
import Catalog from '../../../../shared/state/catalog'

export default class MatchResultsRegion extends Region {
  // Whether the results have been seen already
  seen: boolean

  // Text saying if you won or lost
  txtResult: Phaser.GameObjects.Text

  // Scrollable panel containing details about the results of each round
  scrollablePanel: FixWidthSizer

  // Avatar images for both players
  ourAvatar: Phaser.GameObjects.Image
  theirAvatar: Phaser.GameObjects.Image

  // The panel that shows results of the match
  panel: ScrollablePanel

  /** Footer row from {@link createButtons} (Hide / Play Again / Exit); optional when subclasses replace buttons. */
  protected footerButtons?: Phaser.GameObjects.Container

  WIDTH = 300
  HEIGHT = Space.windowHeight - (Space.buttonHeight + Space.pad * 2) * 2

  create(scene: MatchScene): this {
    this.scene = scene
    this.seen = false
    this.container = scene.add.container().setDepth(Depth.results)
    this.scene.plugins.get('rexAnchor')['add'](this.container, {
      x: `50%`,
      y: `50%`,
    })

    this.createBackground()
    this.createContent()
    this.createButtons()

    // Start hidden
    this.hide()

    return this
  }

  displayState(state: GameModel): void {
    this.deleteTemp()

    // If the game isn't over, hide this
    if (state.winner === null) {
      this.hide()
      return
    }

    // If we are in a recap, hide this
    if (state.isRecap) {
      this.hide()
      return
    }

    // If the results have been shown before, hide this
    if (this.seen) {
      this.hide()
      return
    }

    this.populateResults(state)

    this.show()
    this.seen = true
  }

  /** Victory/defeat header, avatars, and round breakdown (used by journey unlock flow after dismiss). */
  protected populateResults(state: GameModel): void {
    // Avatars
    const av1 = avatarNames[state.cosmeticSets[0].avatar]
    const av2 = avatarNames[state.cosmeticSets[1].avatar]
    this.setFullAvatarTexture(this.ourAvatar, `avatar-${av1}Full`)
    this.setFullAvatarTexture(this.theirAvatar, `avatar-${av2}Full`)

    this.txtResult.setVisible(true)
    this.ourAvatar.setVisible(true)
    this.theirAvatar.setVisible(true)

    // Text saying if you won or lost
    this.txtResult.setText(state.winner === 0 ? 'Victory' : 'Defeat')

    // Further detail how each round went
    this.displayRoundResults(state)

    // Ensure panel layout
    this.panel.setVisible(true).layout()
  }

  hide(): this {
    this.panel.setVisible(false)
    super.hide()

    return this
  }

  show(): this {
    this.panel.setVisible(true)
    super.show()

    return this
  }

  private createBackground() {
    let background = this.scene.add
      .rectangle(0, 0, 1, 1, Color.darken, 0.9)
      .setInteractive()
      .on('pointerdown', () => {
        this.hide()
      })
    this.scene.plugins.get('rexAnchor')['add'](background, {
      width: `100%`,
      height: `100%`,
    })
    this.container.add(background)
  }

  protected createButtons() {
    const container = this.scene.add.container()
    this.footerButtons = container
    this.container.add(container)
    this.scene.plugins.get('rexAnchor')['add'](container, {
      y: `50%-${Space.pad + Space.buttonHeight / 2}`,
    })

    // Review
    new Buttons.Basic({
      within: container,
      text: 'Hide',
      x: -(Space.pad + Space.buttonWidth),
      f: this.reviewCallback(),
    })

    // Replay
    new Buttons.Basic({
      within: container,
      text: 'Play Again',
      f: this.newMatchCallback(),
    })

    // Exit
    new Buttons.Basic({
      within: container,
      text: 'Exit Match',
      x: Space.pad + Space.buttonWidth,
      f: this.scene.doExit(),
    })
  }

  private createContent() {
    // Win/Lose text
    this.txtResult = this.scene.add
      .text(
        0,
        -(this.HEIGHT / 2 + Space.pad),
        'Victory',
        Style.announcementOverBlack,
      )
      .setOrigin(0.5, 1)

    // Your avatar
    this.ourAvatar = this.scene.add
      .image(-this.WIDTH / 2, 0, 'avatar-JulesFull')
      .setInteractive()
      .setOrigin(1, 0.5)
    this.setFullAvatarTexture(this.ourAvatar, 'avatar-JulesFull')
    this.theirAvatar = this.scene.add
      .image(this.WIDTH / 2, 0, 'avatar-MiaFull')
      .setInteractive()
      .setOrigin(0, 0.5)
    this.setFullAvatarTexture(this.theirAvatar, 'avatar-MiaFull')

    // Create the panel with more details about the results
    this.createResultsPanel()

    this.container.add([
      this.txtResult,
      this.ourAvatar,
      this.theirAvatar,
      // this.panel, NOTE Scrollable panel is bugged with containers
    ])
  }

  private setFullAvatarTexture(
    avatar: Phaser.GameObjects.Image,
    textureKey: string,
  ): void {
    avatar.setTexture(textureKey)

    const source = this.scene.textures.get(textureKey).getSourceImage()
    const scale = this.HEIGHT / source.height

    avatar.setScale(scale)
  }

  private createResultsPanel() {
    const background = this.createSizerBackground()

    // NOTE Scrollable panel is bugged with containers, so it has it's own anchor
    this.panel = newScrollablePanel(this.scene, {
      width: this.WIDTH,
      height: this.HEIGHT,
      background: background,
      header: this.createHeader(),
      panel: {
        child: this.createScrollablePanel(),
      },
      anchor: {
        x: `50%`,
        y: `50%`,
      },
    })
      .setDepth(Depth.results)
      .setOrigin(0.5)
  }

  private createSizerBackground() {
    const background = this.scene.rexUI.add
      .roundRectangle(0, 0, 1, 1, Space.corner, Color.backgroundDark)
      .setDepth(Depth.results)
      // TODO This causes the panel to not be click and draggable
      .setInteractive()

    // Add a border around the shape TODO Make a class for this to keep it dry
    let postFxPlugin = this.scene.plugins.get('rexOutlinePipeline')
    postFxPlugin['add'](background, {
      thickness: 1,
      outlineColor: Color.border,
    })

    return background
  }

  private createHeader(): FixWidthSizer {
    const background = this.scene.add
      .rectangle(0, 0, 1, 1, Color.backgroundLight)
      .setInteractive()
    this.scene.addShadow(background, -90)

    let sizer = this.scene.rexUI.add
      .fixWidthSizer({
        width: this.WIDTH,
        align: 'center',
        space: {
          top: Space.pad,
          bottom: Space.pad,
        },
      })
      .addBackground(background)
      .setDepth(Depth.results)

    let txt = this.scene.add
      .rexBBCodeText(0, 0, 'Results:', BBStyle.matchResultsHeader)
      .setOrigin(0.5)
      .setDepth(Depth.results)
    sizer.add(txt)

    return sizer
  }

  private createScrollablePanel() {
    this.scrollablePanel = this.scene.rexUI.add.fixWidthSizer({
      x: 0,
      y: 0,
      align: 'center',
      space: {
        top: Space.pad,
      },
    })

    return this.scrollablePanel
  }

  private newMatchCallback(): () => void {
    return () => {
      // Restarts the game scene with same arguments (Deck, matchmaking, etc)
      this.scene.scene.restart()
    }
  }

  protected reviewCallback(): () => void {
    return () => {
      this.hide()
    }
  }

  // Display details about how each round went in the scrollable panel
  private displayRoundResults(state: GameModel): void {
    for (let i = 0; i < state.roundResults[0].length; i++) {
      const round = i + 1

      // Container containing elements for this round
      let sizer = this.scene.rexUI.add
        .fixWidthSizer({
          width: this.WIDTH,
          align: 'center',
          space: {
            top: Space.pad,
            bottom: Space.pad,
          },
        })
        .setDepth(Depth.results)

      // Our points vs their points
      const ours = state.roundResults[0][i]
      const theirs = state.roundResults[1][i]
      const s = `Round ${round}\n${ours} - ${theirs}`
      let txt = this.scene.add
        .rexBBCodeText(0, 0, s, BBStyle.basicStylized)
        .setDepth(Depth.results)

      // Visual to show who is the winner
      let background
      if (ours > theirs) {
        background = this.scene.add
          .image(0, 0, 'chrome-ResultGlow')
          .setDepth(Depth.results)
          .setRotation(Math.PI)
      } else if (theirs > ours) {
        background = this.scene.add
          .image(0, 0, 'chrome-ResultGlow')
          .setDepth(Depth.results)
      }
      if (background) {
        sizer.addBackground(background)
      }

      sizer.add(txt)
      this.scrollablePanel.add(sizer)
    }
  }
}

import { MatchScene } from '../matchScene'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'
import { TUTORIAL_LENGTH } from '../../../../shared/settings'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'

const JOURNEY_UNLOCK_CARD_SCALE = 0.55

/**
 * Journey missions: full-screen unlock strip (`missionCards`) before the normal
 * Victory / round breakdown (same pattern as {@link ResultsRegionTutorial} replacing results).
 */
export class ResultsRegionJourney extends MatchResultsRegion {
  private unlockDismissed = false
  private unlockBuilt = false
  private lastGameState: GameModel | null = null
  private unlockLayer!: Phaser.GameObjects.Container
  private rowSizer!: any

  override create(scene: MatchScene): this {
    super.create(scene)
    this.buildUnlockLayer()
    return this
  }

  override displayState(state: GameModel): void {
    this.deleteTemp()

    if (state.winner === null) {
      this.unlockDismissed = false
      this.unlockBuilt = false
      this.unlockLayer?.setVisible(false)
      this.hide()
      return
    }
    if (state.isRecap) {
      this.hide()
      return
    }
    if (this.seen) {
      this.hide()
      return
    }

    const ids = (this.scene.params?.missionCards ?? []) as number[]
    const needsUnlock =
      state.winner === 0 && ids.length > 0 && !this.unlockDismissed

    if (needsUnlock) {
      this.lastGameState = state
      this.ensureUnlockCards(ids)
      this.unlockLayer.setVisible(true)
      this.panel.setVisible(false)
      this.txtResult.setVisible(false)
      this.ourAvatar.setVisible(false)
      this.theirAvatar.setVisible(false)
      this.footerButtons?.setVisible(false)
      this.show()
      return
    }

    this.unlockLayer.setVisible(false)
    this.populateResults(state)
    this.footerButtons?.setVisible(true)
    this.show()
    this.seen = true
  }

  private buildUnlockLayer(): void {
    const scene = this.scene
    this.unlockLayer = scene.add.container(0, 0)

    const backdrop = scene.add
      .rectangle(0, 0, 1, 1, Color.darken, 0.88)
      .setInteractive()
    scene.plugins.get('rexAnchor')['add'](backdrop, {
      width: `100%`,
      height: `100%`,
    })
    this.unlockLayer.add(backdrop)

    const title = scene.add
      .text(0, 0, 'Cards unlocked!', Style.announcementOverBlack)
      .setOrigin(0.5)

    this.rowSizer = scene.rexUI.add.fixWidthSizer({
      space: { item: Space.pad, left: Space.pad, right: Space.pad },
    })

    const btnWrap = scene.add.container(0, 0)
    new Buttons.Basic({
      within: btnWrap,
      text: 'Continue',
      f: () => this.onUnlockContinue(),
      muteClick: true,
    })

    const stack = scene.rexUI
      .add.sizer({
        orientation: 'y',
        space: { item: Space.pad * 2 },
      })
      .add(title, { align: 'center' })
      .add(this.rowSizer, { align: 'center' })
      .add(btnWrap, { align: 'center' })

    this.unlockLayer.add(stack as unknown as Phaser.GameObjects.GameObject)
    stack.layout()

    this.unlockLayer.setVisible(false)
    this.container.add(this.unlockLayer)
    this.unlockLayer.setDepth(Depth.results + 1)
  }

  private ensureUnlockCards(ids: number[]): void {
    if (this.unlockBuilt) return
    this.unlockBuilt = true
    for (const id of ids) {
      const card = Catalog.getCardById(id)
      const ci = new CardImage(card, this.rowSizer, false, true, 0)
      ci.container.setScale(JOURNEY_UNLOCK_CARD_SCALE)
      this.rowSizer.add(ci.container)
    }
    this.rowSizer.layout()
  }

  private onUnlockContinue(): void {
    if (this.unlockDismissed) return
    this.unlockDismissed = true
    this.unlockLayer.setVisible(false)
    if (this.lastGameState) {
      this.displayState(this.lastGameState)
    }
  }

  override hide(): this {
    this.unlockLayer?.setVisible(false)
    return super.hide()
  }
}

export class ResultsRegionTutorial extends MatchResultsRegion {
  missionID: number

  protected createButtons() {
    const container = this.scene.add.container()
    this.container.add(container)
    this.scene.plugins.get('rexAnchor')['add'](container, {
      y: `50%-${Space.pad + Space.buttonHeight / 2}`,
    })

    // Continue
    new Buttons.Basic({
      within: container,
      text: 'Continue',
      f: this.continueCallback(),
    })
  }

  private continueCallback(): () => void {
    return () => {
      logEvent(`tutorial_complete_${this.missionID}`)

      // If we are done with tutorials,
      if (this.missionID >= TUTORIAL_LENGTH) {
        this.scene.scene.start('HomeScene')
      } else {
        if (!server || !server.isOpen()) {
          this.scene.signalError(Messages.disconnectError)
          return
        }

        this.scene.scene.start('TutorialMatchScene', {
          missionID: this.missionID,
        })
      }
    }
  }
}

export class MatchResultsSimplifiedRegion extends MatchResultsRegion {
  protected createButtons() {
    const container = this.scene.add.container()
    this.container.add(container)
    this.scene.plugins.get('rexAnchor')['add'](container, {
      y: `50%-${Space.pad + Space.buttonHeight / 2}`,
    })

    // Review
    new Buttons.Basic({
      within: container,
      text: 'Hide',
      x: -(Space.pad + Space.buttonWidth) / 2,
      f: this.reviewCallback(),
    })

    // Exit
    new Buttons.Basic({
      within: container,
      text: 'Exit Match',
      x: (Space.pad + Space.buttonWidth) / 2,
      f: this.scene.doExit(),
    })
  }
}
