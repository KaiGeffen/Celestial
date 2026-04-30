import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import MessageMenu from './message'
import MenuScene from '../menuScene'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'
import Server from '../../server'
import { Ease, Space, Style, Time } from '../../settings/settings'
import REWARD_AMOUNTS from '../../../../shared/config/rewardAmounts'
import newScrollablePanel from '../../lib/scrollablePanel'

export default class ChapterMessageMenu extends MessageMenu {
  private claimGoldMissionId: number | undefined
  private claimGoldButton: Button

  constructor(scene: MenuScene, params) {
    super(scene, params, 700)
  }

  protected createSizer(): void {
    super.createSizer()
    this.sizer.space.line = 0
  }

  protected createContent(params): void {
    this.claimGoldMissionId = params.claimGoldMissionId

    const contentWidth = this.width - 100 // 50px gap on each side
    const sidePad = { padding: { left: 50, right: 50 } }

    // Header: title text centered, then chrome-divider below it
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
    const dH = divider.displayHeight
    divider.setDisplaySize(contentWidth, dH)
    headerSizer.add(divider, { align: 'center' })

    this.sizer
      .add(headerSizer, {
        padding: { left: 50, right: 50, top: Space.padSmall, bottom: 0 },
      })
      .addNewLine()

    // Body: scrollable text, no scrollbar
    const maxTextHeight = Space.windowHeight - 300
    const textPanel = this.scene.rexUI.add.sizer({ width: contentWidth })
    const bodyTxt = this.scene.add
      .text(0, 0, params.s, Style.chapterBody)
      .setWordWrapWidth(contentWidth)
    textPanel.add(bodyTxt)

    const scrollableText = newScrollablePanel(this.scene, {
      width: contentWidth,
      height: maxTextHeight,
      panel: { child: textPanel },
      scrollMode: 'y',
      slider: false,
    })
    this.textScrollablePanel = scrollableText

    this.sizer.add(scrollableText, sidePad).addNewLine()

    this.addFooter()
  }

  private addFooter(): void {
    if (this.claimGoldMissionId === undefined) return
    const buttonsSizer = this.scene.rexUI.add.sizer({
      width: this.width - Space.pad * 2,
      space: {
        left: Space.pad,
        right: Space.pad,
      },
    })

    const claimContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      50,
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
            .text(x, y, `+${REWARD_AMOUNTS.missionComplete}💰`, Style.reward)
            .setOrigin(0.5, 1)

          this.scene.tweens.add({
            targets: rewardText,
            y: y - 40,
            alpha: 0,
            duration: Time.general.rewardFloatMs,
            ease: Ease.basic,
            onComplete: () => rewardText.destroy(),
          })

          Server.claimMissionGold(this.claimGoldMissionId)
          this.scene.game.events.emit('missionGoldClaimed')
          this.claimGoldButton.setText('Gold Claimed').disable()
        }
      },
      muteClick: true,
    })

    buttonsSizer.addSpace().add(claimContainer).addSpace()

    const padding = {
      padding: {
        left: Space.pad,
        right: Space.pad,
        top: Space.pad,
      },
    }

    this.sizer.add(buttonsSizer, padding)
    if (this.isMissionGoldClaimed()) {
      this.claimGoldButton.setText('Gold Claimed').disable()
    } else if (!this.textScrollablePanel?.isOverflowY) {
      this.claimGoldButton.enable()
    } else {
      this.claimGoldButton.disable()
      this.attachUnlockCallback()
    }
  }

  private isMissionGoldClaimed(): boolean {
    return (
      (this.claimGoldMissionId !== undefined &&
        (Server.getUserData().missionGoldClaimed?.[this.claimGoldMissionId] ??
          false)) ||
      false
    )
  }

  private isClaimButtonUnlocked(): boolean {
    return (
      !this.textScrollablePanel?.isOverflowY ||
      this.textScrollablePanel?.t >= 0.999
    )
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
