import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import MessageMenu from './message'
import MenuScene from '../menuScene'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'
import Server from '../../server'
import { BBStyle, Ease, Space, Style, Time } from '../../settings/settings'
import REWARD_AMOUNTS from '../../../../shared/config/rewardAmounts'
import newScrollablePanel from '../../lib/scrollablePanel'

const PAD_LEFT_RIGHT = 50

export default class ChapterMessageMenu extends MessageMenu {
  private claimGoldMissionId: number | undefined
  private claimGoldButton: Button

  constructor(scene: MenuScene, params) {
    super(scene, params, 800)
  }

  protected createSizer(): void {
    super.createSizer()
    this.sizer.space.line = 0
  }

  protected createContent(params): void {
    this.claimGoldMissionId = params.claimGoldMissionId

    const contentWidth = this.width - 100 // PAD_LEFT_RIGHTpx gap on each side
    const sidePad = { padding: { left: PAD_LEFT_RIGHT, right: PAD_LEFT_RIGHT } }

    this.createChapterHeader(params)

    this.createChapterBody(params)

    this.createFooter()
  }

  private createChapterHeader(params): void {
    // Title text centered, chrome-divider
    const headerSizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      width: this.width - PAD_LEFT_RIGHT * 2,
      space: { item: Space.padSmall },
    })

    const headerTxt = this.scene.add
      .text(0, 0, params.title, Style.chapterHeader)
      .setOrigin(0.5, 0)
    headerSizer.add(headerTxt, { align: 'center' })

    const divider = this.scene.add.image(0, 0, 'chrome-divider').setScale(0.35)
    const dH = divider.displayHeight
    divider.setDisplaySize(this.width - PAD_LEFT_RIGHT * 2, dH)
    headerSizer.add(divider, { align: 'center' })

    this.sizer
      .add(headerSizer, {
        padding: {
          left: PAD_LEFT_RIGHT,
          right: PAD_LEFT_RIGHT,
          top: Space.padSmall,
        },
      })
      .addNewLine()
  }

  private createChapterBody(params): void {
    // Scrollable content — image beside first paragraph, remaining paragraphs below
    const maxTextHeight = Space.windowHeight - 300

    // Sizer
    const top = this.scene.rexUI.add.sizer({
      width: this.width - PAD_LEFT_RIGHT * 2,
    })
    const bottom = this.scene.rexUI.add.sizer()
    const contentPanel = this.scene.rexUI.add
      .sizer({
        orientation: 'vertical',
        width: this.width - PAD_LEFT_RIGHT * 2,
      })
      .add(top)
      .add(bottom)

    this.textScrollablePanel = newScrollablePanel(this.scene, {
      width: this.width - PAD_LEFT_RIGHT * 2,
      height: maxTextHeight,
      panel: { child: contentPanel },
      scrollMode: 'y',
      slider: false,
    })

    // Create image
    const imageContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.cardWidth,
      0,
    )
    const imageKey = `card/subject-${params.cardName ?? 'Dove'}`
    const img = this.scene.add
      .image(0, 0, imageKey)
      .setDisplaySize(Space.cardWidth, Space.cardHeight)
      .setOrigin(0.5, 0)
    imageContainer.add(img)
    top.add(imageContainer, { align: 'top' })

    // Text to the right of the image and below that
    const txtTop = this.scene.add
      .text(0, 0, '', Style.chapterBody)
      .setWordWrapWidth(this.width - PAD_LEFT_RIGHT * 2 - Space.cardWidth)
    const txtBottom = this.scene.add
      .text(0, 0, '', Style.chapterBody)
      .setWordWrapWidth(this.width - PAD_LEFT_RIGHT * 2)
    top.add(txtTop, { align: 'top' })
    bottom.add(txtBottom, { align: 'top' })

    // Put the first n lines in this text, the rest into the next one
    const lines = txtTop.getWrappedText(params.s)
    txtTop.setText(lines.slice(0, 13).join('\n'))

    // Get all the text after the lines from the top text
    const lastTopLine = lines[12]
    const splitIndex = params.s.indexOf(lastTopLine) + lastTopLine.length
    const remainingString = params.s.slice(splitIndex).trimStart()
    txtBottom.setText(remainingString)

    // Layout the whole thing, see how much text fits to the right of the image
    this.textScrollablePanel.layout()

    // Add it all to parent sizer
    this.sizer.add(this.textScrollablePanel).addNewLine()
  }

  private createFooter(): void {
    if (this.claimGoldMissionId === undefined) return
    const buttonsSizer = this.scene.rexUI.add.sizer({
      width: this.width - Space.pad * 2,
      space: {
        left: Space.pad,
        right: Space.pad,
        item: Space.pad,
      },
    })

    const claimContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      PAD_LEFT_RIGHT,
    )
    this.claimGoldButton = new Buttons.Basic({
      within: claimContainer,
      text: 'Claim Gold',
      f: () => {
        if (
          this.claimGoldMissionId !== undefined &&
          this.isClaimButtonUnlocked() &&
          !this.isMissionGoldClaimed()
        ) {
          let [x, y] = this.claimGoldButton.getGlobalPosition()
          y -= Space.buttonHeight / 4
          const rewardText = this.scene.add
            .rexBBCodeText(
              x,
              y,
              `[stroke]+${REWARD_AMOUNTS.missionComplete}[/stroke][img=coin]`,
              BBStyle.reward,
            )
            .setOrigin(0.5, 1)

          this.scene.tweens.add({
            targets: rewardText,
            y: y - 40,
            alpha: 0,
            duration: Time.general.rewardFloatMs,
            ease: Ease.basic,
            onComplete: () => rewardText.destroy(),
          })

          Server.claimMissionRewards(this.claimGoldMissionId)
          this.scene.game.events.emit('missionGoldClaimed')
          this.claimGoldButton.setText('Claimed').disable()
        }
      },
      muteClick: true,
    })

    const leftCorner = this.scene.add
      .image(0, 0, 'chrome-corner')
      .setAngle(180)
      .setScale(0.6)
    const rightCorner = this.scene.add
      .image(0, 0, 'chrome-corner')
      .setAngle(90)
      .setScale(0.6)
    buttonsSizer
      .addSpace()
      .add(leftCorner)
      .add(claimContainer)
      .add(rightCorner)
      .addSpace()

    this.sizer.add(buttonsSizer)

    // Adjust button appropriately
    if (this.isMissionGoldClaimed()) {
      this.claimGoldButton.setText('Claimed').disable()
    }
    // If the panel isn't overflowing, button is always enabled
    else if (!this.textScrollablePanel?.isOverflowY) {
      this.claimGoldButton.enable()
    }
    // If the panel is overflowing, button is disabled but can be unlocked by scrolling to the bottom
    else {
      this.claimGoldButton.disable()
      this.attachUnlockCallback()
    }
  }

  // Mission gold has been claimed
  private isMissionGoldClaimed(): boolean {
    return (
      (this.claimGoldMissionId !== undefined &&
        (Server.getUserData().missionGoldClaimed?.[this.claimGoldMissionId] ??
          false)) ||
      false
    )
  }

  private isClaimButtonUnlocked(): boolean {
    const textIsWithinBounds = !this.textScrollablePanel?.isOverflowY
    const userScrolledToBottom = this.textScrollablePanel?.t >= 0.999999

    return textIsWithinBounds || userScrolledToBottom
  }

  private attachUnlockCallback(): void {
    const panel = this.textScrollablePanel
    if (!panel) return

    const unlockIfReady = () => {
      if (!this.isMissionGoldClaimed() && this.isClaimButtonUnlocked()) {
        this.claimGoldButton.enable()
      }
    }

    this.wrapScrollableProperty(panel, 't', unlockIfReady)
    this.wrapScrollableProperty(panel, 'childOY', unlockIfReady)
    unlockIfReady()
  }

  private wrapScrollableProperty(
    panel: object,
    property: 't' | 'childOY',
    callback: () => void,
  ): void {
    const descriptor = this.getPropertyDescriptor(panel, property)
    if (!descriptor?.get || !descriptor?.set) return

    Object.defineProperty(panel, property, {
      configurable: true,
      enumerable: true,
      get() {
        return descriptor.get.call(this)
      },
      set(value) {
        descriptor.set.call(this, value)
        callback()
      },
    })
  }

  private getPropertyDescriptor(obj: object, property: string) {
    let current = obj
    while (current) {
      const descriptor = Object.getOwnPropertyDescriptor(current, property)
      if (descriptor) return descriptor
      current = Object.getPrototypeOf(current)
    }
    return undefined
  }
}
