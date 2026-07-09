import 'phaser'

import Region from './baseRegion'

import {
  Space,
  Color,
  Style,
  BBStyle,
  Depth,
  Messages,
  Time,
  Ease,
} from '../../settings/settings'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'
import GameModel from '@shared/state/gameModel'
import avatarNames from '@shared/data/avatarNames'
import newScrollablePanel from '../../lib/scrollablePanel'
import logEvent from '../../utils/analytics'
import { server } from '../../server'
import { CardImage } from '../../lib/cardImage'
import Catalog from '@shared/state/catalog'
import { animateCardReveal } from '../../lib/cardReveal'

export default class MatchResultsRegion extends Region {
  // Whether the results have been seen already
  seen: boolean

  // Text saying if you won or lost (panel header)
  txtResult: BBCodeText

  // Scrollable panel containing details about the results of each round
  scrollablePanel: FixWidthSizer

  // Avatar images for both players
  ourAvatar: Phaser.GameObjects.Image
  theirAvatar: Phaser.GameObjects.Image

  // Border strokes over the avatar images (matching journeyScene overlay style)
  private ourAvatarBorder: Phaser.GameObjects.Rectangle
  private theirAvatarBorder: Phaser.GameObjects.Rectangle

  // The panel that shows results of the match
  panel: ScrollablePanel

  /** Footer row from {@link createButtons} (Hide / Play Again / Exit); optional when subclasses replace buttons. */
  protected footerButtons?: Phaser.GameObjects.Container

  WIDTH = 300
  HEIGHT = Space.windowHeight - (Space.buttonHeight + Space.pad * 3)

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

    // PVP rewards a gem for valid matches
    if (this.scene.params?.isPvp && state.roundCount >= 3) {
      this.showGemReward()
    }
  }

  /** How gem reward for pvp */
  private showGemReward(): void {
    const x = Space.windowWidth / 2
    const y = Space.windowHeight / 2
    const gemText = this.scene.add
      .rexBBCodeText(x, y, `[stroke]+1[/stroke][img=gem]`, BBStyle.reward)
      .setOrigin(0.5, 1)
    // NOTE Because the panel can't be in container (phaser bug) and this must be above, this can't be in container
    gemText.setDepth(Depth.results + 1)

    this.scene.tweens.add({
      targets: gemText,
      y: y - 40,
      alpha: 0,
      duration: Time.general.rewardFloatMs,
      ease: Ease.basic,
      onComplete: () => gemText.destroy(),
    })
  }

  /** Victory/defeat header, avatars, and round breakdown (used by journey unlock flow after dismiss). */
  protected populateResults(state: GameModel): void {
    // Avatars
    const av1 = avatarNames[state.cosmeticSets[0].avatar]
    const av2 = avatarNames[state.cosmeticSets[1].avatar]
    this.setFullAvatarTexture(this.ourAvatar, `avatar-${av1}Full`)
    this.setFullAvatarTexture(this.theirAvatar, `avatar-${av2}Full`)

    this.ourAvatarBorder.setSize(this.ourAvatar.displayWidth, this.HEIGHT)
    this.theirAvatarBorder.setSize(this.theirAvatar.displayWidth, this.HEIGHT)

    this.txtResult.setVisible(true)
    this.ourAvatar.setVisible(true)
    this.theirAvatar.setVisible(true)
    this.ourAvatarBorder.setVisible(true)
    this.theirAvatarBorder.setVisible(true)

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
    // Your avatar
    this.ourAvatar = this.scene.add
      .image(
        -this.WIDTH / 2,
        -(Space.buttonHeight + Space.pad) / 2,
        'avatar-JulesFull',
      )
      .setInteractive()
      .setOrigin(1, 0.5)
    this.setFullAvatarTexture(this.ourAvatar, 'avatar-JulesFull')
    this.theirAvatar = this.scene.add
      .image(
        this.WIDTH / 2,
        -(Space.buttonHeight + Space.pad) / 2,
        'avatar-MiaFull',
      )
      .setInteractive()
      .setOrigin(0, 0.5)
    this.setFullAvatarTexture(this.theirAvatar, 'avatar-MiaFull')

    // Border strokes over the avatar images
    this.ourAvatarBorder = this.scene.add
      .rectangle(
        -this.WIDTH / 2,
        -(Space.buttonHeight + Space.pad) / 2,
        this.ourAvatar.displayWidth,
        this.HEIGHT,
        0x000000,
        0,
      )
      .setOrigin(1, 0.5)
      .setStrokeStyle(3, Color.backgroundStroke)
    this.theirAvatarBorder = this.scene.add
      .rectangle(
        this.WIDTH / 2,
        -(Space.buttonHeight + Space.pad) / 2,
        this.theirAvatar.displayWidth,
        this.HEIGHT,
        0x000000,
        0,
      )
      .setOrigin(0, 0.5)
      .setStrokeStyle(3, Color.backgroundStroke)

    // Create the panel with more details about the results
    this.createResultsPanel()

    this.container.add([
      this.ourAvatar,
      this.ourAvatarBorder,
      this.theirAvatar,
      this.theirAvatarBorder,
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
        y: `50%-${(Space.buttonHeight + Space.pad) / 2}`,
      },
    })
      .setDepth(Depth.results)
      .setOrigin(0.5)
  }

  private createSizerBackground() {
    const background = this.scene.add
      .image(0, 0, 'chrome-builderDecklist')
      .setDepth(Depth.results)
      // TODO This causes the panel to not be click and draggable
      .setInteractive()

    return background
  }

  private createHeader(): FixWidthSizer {
    const background = this.scene.add
      .rectangle(0, 0, this.WIDTH, this.HEIGHT, Color.backgroundDark)
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

    this.txtResult = this.scene.add
      .rexBBCodeText(0, 0, 'Victory', BBStyle.matchResultsHeader)
      .setOrigin(0.5)
      .setDepth(Depth.results)
    sizer.add(this.txtResult)

    return sizer
  }

  private createScrollablePanel() {
    this.scrollablePanel = this.scene.rexUI.add.fixWidthSizer()

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
    // Round-result win highlight vertical shaping (tweak to taste):
    // inset trims the band's height (larger = shorter), offset shifts it up.
    const HIGHLIGHT_VERTICAL_INSET = 34
    const HIGHLIGHT_Y_OFFSET = 13

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

      // Highlight the winner's half of the row with chrome
      const vPad = {
        top: HIGHLIGHT_VERTICAL_INSET - HIGHLIGHT_Y_OFFSET,
        bottom: HIGHLIGHT_VERTICAL_INSET + HIGHLIGHT_Y_OFFSET,
      }
      if (ours > theirs) {
        const background = this.scene.add
          .image(0, 0, 'chrome-divider')
          .setDepth(Depth.results)
        background.setCrop(0, 0, background.width / 3, background.height)
        sizer.addBackground(background, vPad)
      } else if (theirs > ours) {
        const background = this.scene.add
          .image(0, 0, 'chrome-divider')
          .setDepth(Depth.results)
        background.setCrop(
          (background.width * 2) / 3,
          0,
          background.width / 3,
          background.height,
        )
        sizer.addBackground(background, vPad)
      }

      // Round results per row
      const s = `[b]Round ${round}[/b]\n${ours} - ${theirs}`
      let txt = this.scene.add
        .rexBBCodeText(0, 0, s, BBStyle.basicStylized)
        .setDepth(Depth.results)

      sizer.add(txt)
      this.scrollablePanel.add(sizer)
    }
  }
}

import { MatchScene } from '../matchScene'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'
import { TUTORIAL_LENGTH } from '@shared/settings'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import BBCodeText from 'phaser3-rex-plugins/plugins/bbcodetext'

/** Outer cell for an unlock card; holds the pair we tween after rex `layout()`. */
type JourneyUnlockCardWrap = ContainerLite & {
  journeyUnlockPair: { ci: CardImage; cardback: CardImage }
}

/**
 * Journey missions: cards-unlocked screen (`missionCards`) shown before the normal
 * Victory / round breakdown. Vertical rexUI sizer (auto-sized to its contents):
 * title → cards row → disclaimer → Continue button.
 */
export class ResultsRegionJourney extends MatchResultsRegion {
  private unlockDismissed = false
  private unlockBuilt = false
  private lastGameState: GameModel | null = null

  // Full-screen dim behind the unlock panel; anchored to the viewport.
  private unlockBackdrop: Phaser.GameObjects.Rectangle
  // Vertical sizer (title / cards / disclaimer / button) — auto-sizes to contents.
  private unlockSizer: FixWidthSizer
  // Inner horizontal sizer for the row of card images.
  private cardsRow: Sizer
  // Disabled until every cardback has been clicked / flipped.
  private btnContinue: Button

  override create(scene: MatchScene): this {
    super.create(scene)
    this.buildUnlockLayer()
    return this
  }

  override displayState(state: GameModel): void {
    this.deleteTemp()

    // Don't show during pre-game, recap, or after results have been seen.
    if (state.winner === null || state.isRecap || this.seen) {
      this.hide()
      return
    }

    const ids = this.scene.params?.missionCards ?? []
    const showUnlock =
      state.winner === 0 && ids.length > 0 && !this.unlockDismissed

    if (showUnlock) {
      this.lastGameState = state
      this.populateUnlockCards(ids)
      // Hide the parent's standard results UI while the unlock panel is up.
      this.container.setVisible(false)
      this.panel.setVisible(false)
      this.setUnlockVisible(true)
      return
    }

    // Normal results flow (unlock dismissed or none to unlock)
    this.setUnlockVisible(false)
    this.populateResults(state)
    this.show()
    this.seen = true
  }

  override hide(): this {
    this.setUnlockVisible(false)
    return super.hide()
  }

  private setUnlockVisible(visible: boolean): void {
    this.unlockBackdrop?.setVisible(visible)
    this.unlockSizer?.setVisible(visible)
  }

  private buildUnlockLayer(): void {
    const scene = this.scene

    this.unlockBackdrop = scene.add
      .rectangle(0, 0, 1, 1, Color.darken, 0.85)
      .setInteractive()
      .setDepth(Depth.results + 1)
    scene.plugins.get('rexAnchor')['add'](this.unlockBackdrop, {
      x: `50%`,
      y: `50%`,
      width: `100%`,
      height: `100%`,
    })

    // Mulligan-style RoundRectangle background; sized by the sizer via addBackground.
    const panelBg = this.scene.add.image(0, 0, 'chrome-bodyAlt')

    // Title text
    const title = scene.add.text(0, 0, 'Memories Unlocked!', Style.header)

    // Cards
    this.cardsRow = scene.rexUI.add.sizer({
      space: { item: Space.pad },
    })

    // Disclaimer text
    const countUnlockedCards = (scene.params?.missionCards ?? []).length
    const disclaimer = scene.add.text(
      0,
      0,
      `You may now use ${countUnlockedCards === 1 ? 'this card' : 'these cards'} in Journey mode.`,
      Style.basicStylized,
    )

    // Buttons
    const btnContainer = new ContainerLite(
      scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    this.btnContinue = new Buttons.Basic({
      within: btnContainer,
      text: 'Continue',
      f: () => this.onContinue(),
    })

    // Main sizer
    const width = Space.cardWidth * 3 + Space.pad * 4
    this.unlockSizer = scene.rexUI.add
      .fixWidthSizer({
        width,
        align: 'center',
        space: {
          line: Space.pad,
          left: Space.pad,
          right: Space.pad,
          top: Space.pad,
          bottom: Space.padSmall,
        },
      })
      .addBackground(panelBg)
      .add(title)
      .addNewLine()
      .add(this.cardsRow)
      .addNewLine()
      .add(disclaimer)
      .addNewLine()
      .add(btnContainer)

    scene.plugins.get('rexAnchor')['add'](this.unlockSizer, {
      x: `50%`,
      y: `50%`,
    })
    this.unlockSizer.setDepth(Depth.results + 2).layout()

    this.setUnlockVisible(false)
  }

  private populateUnlockCards(ids: number[]): void {
    if (this.unlockBuilt) return
    this.unlockBuilt = true

    let unrevealedCount = 0
    for (const id of ids) {
      const card = Catalog.getCardById(id)
      if (!card) continue

      const cardContainer = new ContainerLite(
        this.scene,
        0,
        0,
        Space.cardWidth,
        Space.cardHeight,
      ) as JourneyUnlockCardWrap
      // Real card sits hidden underneath; revealed by `animateCardReveal` on click.
      // Constructed interactive so it has the standard hover/click behavior once
      // shown — Phaser skips invisible objects in hit tests, so the cardback on
      // top is the only thing that receives pointer events until then.
      // Pre-apply the visible glow so it fades in along with the front during the flip.
      const ci = new CardImage(card, cardContainer, true, true, 0)
        .setVisibleGlow()
        .hide()
      // Clickable cardback overlay — pre-empts the helper's own cardback so the
      // user clicks *this* one to trigger the flip. Interaction enabled after
      // post-layout scale-in (see below).
      const cardback = new CardImage(
        Catalog.cardback,
        cardContainer,
        false,
        true,
        0,
      )
      cardback.setOnClick(() => {
        this.scene.playSound('inspire')
        cardback.destroy()
        animateCardReveal(
          this.scene,
          ci,
          cardContainer,
          0,
          Time.match.matchResultsUnlockCardReveal,
        )

        unrevealedCount--
        if (unrevealedCount === 0) {
          this.btnContinue.enable()
        }
      })

      cardContainer.journeyUnlockPair = { ci, cardback }
      this.cardsRow.add(cardContainer)
      unrevealedCount++
    }

    // Re-flow now that cards are in, then re-apply depth so the late-added cards
    // render above the sizer's background (rexUI's setDepth only walks current children).
    this.unlockSizer.layout()
    this.unlockSizer.setDepth(Depth.results + 2)

    const scaleInMs = Time.match.matchResultsUnlockCardScaleInMs
    // Scale must be applied after `layout()` — rexUI positioning can reset child transforms.
    const row = this.cardsRow as Sizer & {
      sizerChildren: Phaser.GameObjects.GameObject[]
    }
    row.sizerChildren.forEach((child) => {
      const wrap = child as JourneyUnlockCardWrap
      const { ci, cardback } = wrap.journeyUnlockPair
      ci.container.setScale(0)
      cardback.container.setScale(0)

      this.scene.tweens.add({
        targets: ci.container,
        scaleX: 1,
        scaleY: 1,
        duration: scaleInMs,
        ease: 'Cubic.easeOut',
      })
      this.scene.tweens.add({
        targets: cardback.container,
        scaleX: 1,
        scaleY: 1,
        duration: scaleInMs,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          cardback.imageSubject.setInteractive()
          cardback.interactive = true
        },
      })
    })

    // Continue is gated on the player flipping every cardback (re-enabled in the
    // click handler when `unrevealedCount` hits 0).
    if (unrevealedCount > 0) {
      this.btnContinue.disable()
    }
  }

  private onContinue(): void {
    if (this.unlockDismissed) return
    this.unlockDismissed = true
    this.setUnlockVisible(false)
    if (this.lastGameState) {
      this.displayState(this.lastGameState)
    }
  }
}

export class ResultsRegionTutorial extends ResultsRegionJourney {
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
