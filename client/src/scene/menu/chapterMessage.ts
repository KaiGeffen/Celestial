import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import MessageMenu from './message'
import MenuScene from '../menuScene'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'
import Server from '../../server'
import { Ease, Space, Style } from '../../settings/settings'
import REWARD_AMOUNTS from '../../../../shared/config/rewardAmounts'

export default class ChapterMessageMenu extends MessageMenu {
  private claimGoldMissionId: number | undefined
  private claimGoldButton: Button

  constructor(scene: MenuScene, params) {
    super(scene, params)
  }

  protected createContent(params): void {
    this.claimGoldMissionId = params.claimGoldMissionId
    super.createContent(params)
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
            .text(
              x,
              y,
              `+${REWARD_AMOUNTS.missionComplete}💰`,
              Style.homeSceneButton,
            )
            .setOrigin(0.5, 1)

          this.scene.tweens.add({
            targets: rewardText,
            y: y - 40,
            alpha: 0,
            duration: 800,
            ease: Ease.basic,
            onComplete: () => rewardText.destroy(),
          })

          Server.claimMissionGold(this.claimGoldMissionId)
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
