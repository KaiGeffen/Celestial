import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'

import BaseScene from '../baseScene'
import Cutout from '../../lib/buttons/cutout'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'
import DeckThumbnail from '../../lib/deckThumbnail'
import Decklist from '../../lib/decklist'
import { Space, Style } from '../../settings/settings'
import newScrollablePanel from '../../lib/scrollablePanel'
import Card from '../../../../shared/state/card'
import { CosmeticSet } from '../../../../shared/types/cosmeticSet'
import { MechanicsSettings } from '../../../../shared/settings'

/** Props for the deck editor right column — initial list + thumbnails + actions by callback. */
export type DeckEditorDeckOptions = {
  deckName: string
  cosmeticSet: CosmeticSet
  deckCards: Card[]
  requiredCards?: Card[]
  mustOwnCardsInList: boolean
  createCutoutInteraction: () => (cutout: Cutout) => () => void
  onDeckNameClick: () => void
  onSave: () => void
  onCosmetics: () => void
  onPlay: () => void
}

export class RightCol {
  readonly scene: BaseScene

  readonly decklist: Decklist
  readonly scrollPanel: ScrollablePanel

  protected readonly opts: DeckEditorDeckOptions

  constructor(scene: BaseScene, opts: DeckEditorDeckOptions) {
    this.scene = scene
    this.opts = opts

    this.decklist = new Decklist(scene, opts.createCutoutInteraction())

    // TODO MustOwnCardsInList
    this.decklist.setDeck(opts.deckCards)

    // Create the scroll panel
    this.scrollPanel = newScrollablePanel(scene, {
      // Components
      header: this.createHeader(),
      footer: this.createFooter(),
      panel: { child: this.createBody() },

      // Anchor
      anchor: {
        height: '100%',
      },
    })

    this.updateCardCounts()
  }

  layoutDecklist(): void {
    const panel = this.scrollPanel
    panel.t = Math.min(0.999999, panel.t)
    panel.layout()
    this.updateCardCounts()
  }

  scrollDecklistToTop(): void {
    this.scrollPanel.t = 0
    this.scrollPanel.layout()
    this.updateCardCounts()
  }

  // Overwritten in children where a thumbnail exists
  syncThumbnail(_args: {
    name: string
    cosmeticSet: CosmeticSet
    isValid: boolean
    cardCount?: number
  }): void {}

  // Overwritten in children
  protected createHeader(): FixWidthSizer {
    return null
  }

  protected createBody(): FixWidthSizer {
    return this.scene.rexUI.add
      .fixWidthSizer({ width: Space.cutoutWidth + Space.padSmall * 2 })
      .add(this.decklist.sizer)
  }

  // Overwritten in children that need dynamic footer state (e.g. Play enabled/disabled).
  protected updateCardCounts(): void {}

  protected createFooter(): FixWidthSizer {
    const bg = this.scene.add
      .rectangle(0, 0, 1, 1)
      .setAlpha(0.01)
      .setInteractive()

    // Lambda for creating buttons
    const smallBtn = (text: string, fn: () => void, muteClick = false) => {
      const wrap = new ContainerLite(
        this.scene,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )
      new Buttons.Basic({ within: wrap, text, f: fn, muteClick })
      return wrap
    }

    // On the left are 2 small buttons
    const leftCol = this.scene.rexUI.add.sizer({
      orientation: 1,
      space: { top: 9, item: Space.padSmall },
    })
    leftCol.add(smallBtn('Save', () => this.opts.onSave()))
    leftCol.add(smallBtn('Cosmetics', () => this.opts.onCosmetics(), true))

    // Play button
    const rightCol = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.bigButtonHeight,
    )
    new Buttons.Big({
      within: rightCol,
      text: 'Play',
      f: () => this.opts.onPlay(),
      muteClick: true,
    })

    // Main sizer
    const sizer = this.scene.rexUI.add
      .fixWidthSizer({
        space: {
          left: Space.pad,
          right: Space.pad,
          top: Space.pad,
          bottom: Space.pad,
          item: Space.padSmall,
        },
        align: 'center',
      })
      .addBackground(bg)
      .add(leftCol)
      .add(rightCol)

    return sizer
  }
}

/**
 * Deck editor right column: thumbnail, scrolling decklist, footer actions.
 * Rex child order: header → scroll panel → footer (fixed heights on header/footer).
 */
export class DeckEditorDeck extends RightCol {
  deckThumbnail!: DeckThumbnail

  protected createHeader(): FixWidthSizer {
    const bg = this.scene.add
      .rectangle(0, 0, 1, 1)
      .setAlpha(0.01)
      .setInteractive()

    // Create the thumbnail
    this.deckThumbnail = new DeckThumbnail({
      scene: this.scene,
      onClick: () => this.opts.onDeckNameClick(),
      muteClick: true,
    })

    // Sizer
    const sizer = this.scene.rexUI.add
      .fixWidthSizer({
        space: {
          top: Space.pad,
          bottom: Space.pad,
        },
        align: 'center',
      })
      .addBackground(bg)
      .add(this.deckThumbnail.container)

    // Populate the thumbnail with the current set
    const initialCount = this.decklist.getDeckCode().length
    this.syncThumbnail({
      name: this.opts.deckName,
      cosmeticSet: this.opts.cosmeticSet,
      isValid: initialCount === MechanicsSettings.DECK_SIZE,
      cardCount: initialCount,
    })

    return sizer
  }

  override syncThumbnail(args: {
    name: string
    cosmeticSet: CosmeticSet
    isValid: boolean
    cardCount?: number
  }): void {
    this.deckThumbnail.updateDisplay(args)
  }
}

export class DeckEditorDeckJourney extends RightCol {
  private playBtn?: Button
  private requiredDecklist?: Decklist
  private requiredLabel?: Phaser.GameObjects.Text
  private chosenLabel?: Phaser.GameObjects.Text

  protected createHeader(): FixWidthSizer {
    return this.scene.rexUI.add.fixWidthSizer({
      height: Space.padSmall + Space.iconSize,
    })
  }

  protected override createBody(): FixWidthSizer {
    // Required cards
    const requiredCards = this.opts.requiredCards ?? []
    this.requiredDecklist = new Decklist(this.scene, () => () => {
      this.scene.signalError("Can't remove a required card")
    })
    this.requiredDecklist.setJourneyDeck(requiredCards)

    // Cards in required decklist signal that they can't be removed
    this.requiredDecklist.cutouts.forEach((cutout) => {
      cutout.setOnClick(() => {
        this.scene.signalError("Can't remove a required card")
      })
    })

    return this.scene.rexUI.add
      .fixWidthSizer({
        align: 'center',
        space: {
          top: Space.padSmall,
          left: Space.padSmall,
          right: Space.padSmall,
          line: Space.pad,
        },
      })
      .add((this.requiredLabel = this.createText('Required Cards')))
      .add(this.requiredDecklist.sizer)
      .add((this.chosenLabel = this.createText('Chosen Cards')))
      .add(this.decklist.sizer)
  }

  // Update the displayed and relevant state based on card counts changing
  protected override updateCardCounts(): void {
    const requiredCount = this.requiredDecklist?.getDeckCode().length ?? 0
    const chosenCount = this.decklist.getDeckCode().length
    const chosenTarget = Math.max(
      0,
      MechanicsSettings.DECK_SIZE - requiredCount,
    )

    // Update the text
    this.requiredLabel?.setText(`Required Cards (${requiredCount})`)
    this.chosenLabel?.setText(`Chosen Cards (${chosenCount}/${chosenTarget})`)

    // Update the play button
    if (!this.playBtn) return
    const valid = requiredCount + chosenCount === MechanicsSettings.DECK_SIZE
    if (valid) this.playBtn.enable()
    else this.playBtn.disable()
  }

  private createText(s: string): Phaser.GameObjects.Text {
    return this.scene.add
      .text(0, 0, s, Style.journeyRequiredAndChosenHeader)
      .setOrigin(0.5)
  }

  protected createFooter(): FixWidthSizer {
    const bg = this.scene.add
      .rectangle(0, 0, 1, 1)
      .setAlpha(0.01)
      .setInteractive()

    const playBtn = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.bigButtonHeight,
    )
    this.playBtn = new Buttons.Big({
      within: playBtn,
      text: 'Play',
      f: () => this.opts.onPlay(),
      muteClick: true,
    })

    return this.scene.rexUI.add
      .fixWidthSizer({
        space: {
          left: Space.pad,
          right: Space.pad,
          top: Space.pad,
          bottom: Space.pad,
        },
        align: 'center',
      })
      .addBackground(bg)
      .add(playBtn)
  }

  /** Full deck for starting a match: required mission cards plus chosen cards. */
  getFullDeckCode(): number[] {
    const required = this.requiredDecklist?.getDeckCode() ?? []
    const chosen = this.decklist.getDeckCode()
    return [...required, ...chosen]
  }
}
