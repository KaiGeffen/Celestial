import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import MessageMenu from './message'
import MenuScene from '../menuScene'
import Buttons from '../../lib/buttons/buttons'
import { Space, Style } from '../../settings/settings'
import { UserSettings } from '../../settings/userSettings'
import Server from '../../server'
import JOURNEY_CHOICES, {
  formatJourneyFinaleChapterBody,
} from '../../data/journeyChoices'
import newScrollablePanel from '../../lib/scrollablePanel'

export default class ChoiceChapterMessageMenu extends MessageMenu {
  constructor(scene: MenuScene, params) {
    super(scene, params, 1000)
  }

  protected createSizer(): void {
    super.createSizer()
    this.sizer.space.line = 0
  }

  protected createContent(params): void {
    const avatarIndex: number = params.avatarIndex
    const claimGoldMissionId: number | undefined = params.claimGoldMissionId
    const choiceData = JOURNEY_CHOICES[avatarIndex]
    const contentWidth = this.width - 100
    const sidePad = { padding: { left: 50, right: 50 } }

    // Header
    const headerSizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      width: contentWidth,
      space: { item: Space.padSmall },
    })
    const headerTxt = this.scene.add
      .text(0, 0, params.title, Style.chapterHeader)
      .setOrigin(0.5, 0)
    headerSizer.add(headerTxt, { align: 'center' })
    const divider = this.scene.add.image(0, 0, 'chrome-divider').setScale(0.35)
    divider.setDisplaySize(contentWidth, divider.displayHeight)
    headerSizer.add(divider, { align: 'center' })
    this.sizer
      .add(headerSizer, {
        padding: { left: 50, right: 50, top: Space.padSmall, bottom: 0 },
      })
      .addNewLine()

    // Intro text
    const maxTextHeight = Space.windowHeight - 400
    const introPanel = this.scene.rexUI.add.sizer({ width: contentWidth })
    const introTxt = this.scene.add
      .text(0, 0, choiceData?.intro ?? '', Style.chapterBody)
      .setWordWrapWidth(contentWidth)
    introPanel.add(introTxt)
    const scrollableIntro = newScrollablePanel(this.scene, {
      width: contentWidth,
      height: Math.min(introTxt.height + Space.pad * 2, maxTextHeight),
      panel: { child: introPanel },
      scrollMode: 'y',
      slider: false,
    })
    this.sizer.add(scrollableIntro, sidePad).addNewLine()

    // Two option panels side by side
    if (!choiceData) return
    const optionWidth = (contentWidth - Space.pad) / 2
    const optionsSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      width: contentWidth,
      space: { item: Space.pad },
    })

    choiceData.options.forEach((option, idx: 0 | 1) => {
      const colSizer = this.scene.rexUI.add.sizer({
        orientation: 'vertical',
        width: optionWidth,
        space: { item: Space.padSmall },
      })

      const bg = this.scene.add
        .rectangle(0, 0, optionWidth, 1, 0xf0ece4)
        .setOrigin(0)
        .setStrokeStyle(1, 0xc0b8a8)
      colSizer.addBackground(bg)

      const textInset = 2
      const optionTxt = this.scene.add
        .text(0, 0, option.text, Style.chapterBody)
        .setWordWrapWidth(optionWidth - textInset)
      colSizer.add(optionTxt, {
        padding: {
          top: Space.padSmall,
          bottom: Space.padSmall,
        },
        align: 'top',
      })

      colSizer.addSpace(1)

      const btnContainer = new ContainerLite(
        this.scene,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )
      new Buttons.Basic({
        within: btnContainer,
        text: 'Choose',
        f: () =>
          this.onChoose(
            avatarIndex,
            idx as 0 | 1,
            claimGoldMissionId,
            params.title,
          ),
        muteClick: true,
      })
      colSizer.add(btnContainer, {
        padding: { bottom: Space.padSmall },
        align: 'center',
      })

      optionsSizer.add(colSizer, { proportion: 1, expand: true })
    })

    this.sizer
      .add(optionsSizer, {
        padding: { left: 50, right: 50, bottom: Space.pad },
      })
      .addNewLine()
  }

  private onChoose(
    avatarIndex: number,
    choiceIndex: 0 | 1,
    claimGoldMissionId: number | undefined,
    title: string,
  ): void {
    UserSettings._setIndex('journeyChoices', avatarIndex, choiceIndex)
    Server.sendJourneyChoice(avatarIndex, choiceIndex)

    const resultText = formatJourneyFinaleChapterBody(avatarIndex, choiceIndex)

    // Restart MenuScene as a chapterMessage showing the result
    this.scene.scene.restart({
      menu: 'chapterMessage',
      title,
      s: resultText,
      claimGoldMissionId,
    })
  }
}
