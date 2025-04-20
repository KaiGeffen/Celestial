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
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import avatarNames from '../../lib/avatarNames'
import { TUTORIAL_LENGTH } from '../../../../shared/settings'

const width = 300
const height = Math.min(
  Space.avatarHeight,
  Space.windowHeight - (Space.buttonHeight + Space.pad * 2) * 2,
)

export default class ResultsRegion extends Region {
  // Whether the results have been seen already
  seen: boolean

  // Text saying if you won or lost
  txtResult: Phaser.GameObjects.Text

  // Scrollable panel containing details about the results of each round
  scrollablePanel

  // Avatar images for both players
  ourAvatar: Phaser.GameObjects.Image
  theirAvatar: Phaser.GameObjects.Image

  // The panel that shows results of the match
  panel: ScrollablePanel

  create(scene: GameScene): ResultsRegion {
    this.scene = scene
    this.container = scene.add.container(0, 0).setDepth(Depth.results)
    this.seen = false

    // Create background
    let background = scene.add
      .rectangle(0, 0, Space.windowWidth, Space.windowHeight, Color.darken, 0.9)
      .setOrigin(0)
      .setInteractive()
      .on('pointerdown', () => {
        this.hide()
      })
    this.container.add(background)

    this.createContent()

    this.createButtons()

    return this
  }

  displayState(state: GameModel): void {
    this.deleteTemp()

    // If the game isn't over, hide this
    // if (state.winner === null) {
    //   this.hide()
    //   return
    // }

    // // If we are in a recap, hide this
    // if (state.isRecap) {
    //   this.hide()
    //   return
    // }

    // // If the results have been shown before, hide this
    // if (this.seen) {
    //   this.hide()
    //   return
    // }

    state.roundResults = [
      [1, 2, 3, 9, 3, 2, 1, 4, 2],
      [4, 5, 6, 1, 2, 3, 4, 1, 2],
    ]

    // Avatars
    const av1 = avatarNames[state.avatars[0]]
    const av2 = avatarNames[state.avatars[1]]
    this.ourAvatar.setTexture(`avatar-${av1}Full`)
    this.theirAvatar.setTexture(`avatar-${av2}Full`)

    // Text saying if you won or lost
    this.txtResult.setText(state.winner === 0 ? 'Victory' : 'Defeat')

    // Further detail how each round went
    this.displayRoundResults(state)

    // Ensure panel layout TODO Broken
    this.panel.setVisible(true).layout()

    this.show()
    this.seen = true
  }

  protected createButtons() {
    // Exit
    let y = Space.windowHeight - (Space.pad + Space.buttonHeight / 2)
    new Buttons.Basic(
      this.container,
      Space.windowWidth / 2 + Space.pad + Space.buttonWidth,
      y,
      'Exit Match',
      this.exitCallback(),
    )

    // Replay
    new Buttons.Basic(
      this.container,
      Space.windowWidth / 2,
      y,
      'Play Again',
      this.newMatchCallback(),
    )

    // Review
    new Buttons.Basic(
      this.container,
      Space.windowWidth / 2 - Space.pad - Space.buttonWidth,
      y,
      'Hide',
      this.reviewCallback(),
    )
  }

  private createContent() {
    // Win/Lose text
    this.txtResult = this.scene.add
      .text(
        Space.windowWidth / 2,
        Space.pad,
        'Victory',
        Style.announcementOverBlack,
      )
      .setOrigin(0.5, 0)

    // Create the panel with more details about the results
    this.panel = this.createResultsPanel()

    // Your avatar
    this.ourAvatar = this.scene.add
      .image(
        Flags.mobile ? Space.avatarWidth / 2 : Space.windowWidth / 2 - width,
        Space.windowHeight / 2,
        'avatar-JulesFull',
      )
      .setInteractive()
    this.theirAvatar = this.scene.add
      .image(
        Flags.mobile
          ? Space.windowWidth - Space.avatarWidth / 2
          : Space.windowWidth / 2 + width,
        Space.windowHeight / 2,
        'avatar-MiaFull',
      )
      .setInteractive()

    this.container.add([
      this.txtResult,
      this.ourAvatar,
      this.theirAvatar,
      this.panel,
    ])
  }

  private createResultsPanel() {
    let background = this.createBackground()

    this.scrollablePanel = this.scene.rexUI.add.fixWidthSizer({
      width: width,
    })
    const panel = this.scene.rexUI.add.scrollablePanel({
      x: Space.windowWidth / 2,
      y: Space.windowHeight / 2,
      width: width,
      height: height,

      background: background,

      header: this.createHeader(),

      scrollMode: 0,
      panel: {
        child: this.scrollablePanel,
      },
      slider: false,
      mouseWheelScroller: {
        speed: 0.5,
      },
    })

    return panel
  }

  private createBackground() {
    const background = this.scene.rexUI.add.roundRectangle(
      0,
      0,
      0,
      0,
      Space.corner,
      Color.backgroundDark,
    )

    // Add a border around the shape TODO Make a class for this to keep it dry
    let postFxPlugin = this.scene.plugins.get('rexOutlinePipeline')
    postFxPlugin['add'](background, {
      thickness: 1,
      outlineColor: Color.border,
    })

    return background
  }

  private createHeader(): ContainerLite {
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
        width: width,
        align: 'center',
        space: {
          top: Space.pad,
          bottom: Space.pad,
        },
      })
      .addBackground(background)

    let txt = this.scene.add
      .rexBBCodeText(0, 0, 'Results:', {
        ...BBStyle.basic,
        fontSize: '30px',
      })
      .setOrigin(0.5)

    sizer.add(txt)

    return sizer
  }

  private exitCallback(): () => void {
    let that = this
    return function () {
      that.scene.doBack()
    }
  }

  private newMatchCallback(): () => void {
    let that = this
    return function () {
      // Restarts the game scene with same arguments (Deck, matchmaking, etc)
      that.scene.scene.restart()
    }
  }

  private reviewCallback(): () => void {
    let that = this
    return function () {
      that.hide()
    }
  }

  // Display details about how each round went in the scrollable panel
  private displayRoundResults(state: GameModel): void {
    let result = ''

    for (let i = 0; i < state.roundResults[0].length; i++) {
      const round = i + 1

      // Container containing elements for this round
      let sizer = this.scene.rexUI.add
        .fixWidthSizer({
          width: width,
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
          .image(0, 0, 'icon-ResultGlow')
          .setDepth(Depth.results)
          .setRotation(Math.PI)
      } else if (theirs > ours) {
        background = this.scene.add
          .image(0, 0, 'icon-ResultGlow')
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

import { GameScene } from '../gameScene'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

export class ResultsRegionTutorial extends ResultsRegion {
  missionID: number

  protected createButtons() {
    // Continue
    let y = Space.windowHeight - (Space.pad + Space.buttonHeight / 2)
    new Buttons.Basic(
      this.container,
      Space.windowWidth / 2,
      y,
      'Continue',
      this.continueCallback(),
    )
  }

  private continueCallback(): () => void {
    return () => {
      // If we are done with tutorials,
      if (this.missionID >= TUTORIAL_LENGTH) {
        this.scene.scene.start('AdventureScene', { stillframe: 4 })
      } else {
        this.scene.scene.start('TutorialGameScene', {
          missionID: this.missionID,
        })
      }
    }
  }
}
