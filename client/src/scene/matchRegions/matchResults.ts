import 'phaser'

import Region from './baseRegion'

import {
  Space,
  Color,
  Style,
  BBStyle,
  Depth,
  Flags,
} from '../../settings/settings'
import Buttons from '../../lib/buttons/buttons'
import GameModel from '../../../../shared/state/gameModel'
import avatarNames from '../../lib/avatarNames'
import newScrollablePanel from '../../lib/scrollablePanel'

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

  WIDTH = 300
  HEIGHT = Math.min(
    Space.avatarHeight,
    Space.windowHeight - (Space.buttonHeight + Space.pad * 2) * 2,
  )

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

    // Avatars
    const av1 = avatarNames[state.cosmeticSets[0].avatar]
    const av2 = avatarNames[state.cosmeticSets[1].avatar]
    this.ourAvatar.setTexture(`avatar-${av1}Full`)
    this.theirAvatar.setTexture(`avatar-${av2}Full`)

    // Text saying if you won or lost
    this.txtResult.setText(state.winner === 0 ? 'Victory' : 'Defeat')

    // Further detail how each round went
    this.displayRoundResults(state)

    // Ensure panel layout
    this.panel.setVisible(true).layout()

    this.show()
    this.seen = true
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
    this.container.add(container)
    this.scene.plugins.get('rexAnchor')['add'](container, {
      y: `50%-${Space.pad + Space.buttonHeight / 2}`,
    })

    // Exit
    new Buttons.Basic({
      within: container,
      text: 'Exit Match',
      x: Space.pad + Space.buttonWidth,
      f: this.scene.doExit(),
    })

    // Replay
    new Buttons.Basic({
      within: container,
      text: 'Play Again',
      f: this.newMatchCallback(),
    })

    // Review
    new Buttons.Basic({
      within: container,
      text: 'Hide',
      x: -Space.pad - Space.buttonWidth,
      f: this.reviewCallback(),
    })
  }

  private createContent() {
    // Win/Lose text
    //this.HEIGHT / 2 - Space.pad
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
      .image(-this.WIDTH, 0, 'avatar-JulesFull')
      .setInteractive()
    this.theirAvatar = this.scene.add
      .image(this.WIDTH, 0, 'avatar-MiaFull')
      .setInteractive()

    // Create the panel with more details about the results
    this.createResultsPanel()

    this.container.add([
      this.txtResult,
      this.ourAvatar,
      this.theirAvatar,
      // this.panel, NOTE Scrollable panel is bugged with containers
    ])
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
    this.scene.plugins.get('rexDropShadowPipeline')['add'](background, {
      distance: 3,
      angle: -90,
      shadowColor: 0x000000,
    })

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
      .rexBBCodeText(0, 0, 'Results:', {
        ...BBStyle.basic,
        fontSize: '30px',
      })
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

  private reviewCallback(): () => void {
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
        .rexBBCodeText(0, 0, s, BBStyle.basic)
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
      // If we are done with tutorials,
      if (this.missionID >= TUTORIAL_LENGTH) {
        this.scene.scene.start('JourneyScene', { stillframe: 4 })
      } else {
        this.scene.scene.start('TutorialMatchScene', {
          missionID: this.missionID,
        })
      }
    }
  }
}
