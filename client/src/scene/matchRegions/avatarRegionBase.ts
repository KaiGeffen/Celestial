import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import Buttons from '../../lib/buttons/buttons'
import AvatarButton from '../../lib/buttons/avatar'
import { Color, Space, Style } from '../../settings/settings'
import Region from './baseRegion'

const AVATAR_REGION_WIDTH = Space.avatarSize + Space.pad * 2

/** Shared match avatar UI: portrait + username + subtitle + time. */
export default abstract class AvatarRegionBase extends Region {
  avatar: AvatarButton
  imgNameplate: Phaser.GameObjects.Image
  txtUsername: Phaser.GameObjects.Text
  txtSubtitle: Phaser.GameObjects.Text
  txtTime: Phaser.GameObjects.Text

  /** 1s tick while this player's clock is live (PvP only). */
  private clockTimer: Phaser.Time.TimerEvent | null = null

  /** Player slot in shared state arrays (0 = us, 1 = them). */
  protected abstract playerIndex(): 0 | 1

  protected createAvatar(): void {
    this.avatar = new Buttons.Avatar({
      within: this.container,
      x: AVATAR_REGION_WIDTH / 2,
      y: this.avatarCenterY(),
      emotive: this.avatarEmotive(),
    })
  }

  /** Vertical center of the portrait within this region's container. */
  protected abstract avatarCenterY(): number

  protected avatarEmotive(): boolean {
    return false
  }

  protected createUsernames(): void {
    const x = this.avatar.icon.x
    const y0 = this.avatar.icon.y + this.avatar.icon.height / 2
    const usernameY = y0 + 8 + Space.padSmall
    const subtitleY = usernameY + 22
    const timeY = subtitleY + 20
    const nameplateY = (usernameY + subtitleY) / 2

    this.imgNameplate = this.scene.add
      .image(x, nameplateY, 'chrome-nameplate')
      .setOrigin(0.5)
    this.container.add(this.imgNameplate)

    // TODO Move to style file
    this.txtUsername = this.scene.add
      .text(x, usernameY, '', {
        fontFamily: Style.username.fontFamily,
        fontSize: '22px',
        color: Color.whiteS,
        stroke: '#000000',
        strokeThickness: 1.5,
      })
      .setOrigin(0.5)

    this.txtSubtitle = this.scene.add
      .text(x, subtitleY, '', {
        fontFamily: Style.username.fontFamily,
        fontSize: '18px',
        color: Color.whiteS,
        stroke: '#000000',
        strokeThickness: 1.5,
      })
      .setOrigin(0.5)

    this.txtTime = this.scene.add
      .text(x, timeY, '', {
        fontFamily: Style.username.fontFamily,
        fontSize: '16px',
        color: Color.whiteS,
        stroke: '#000000',
        strokeThickness: 1.5,
      })
      .setOrigin(0.5)

    this.container.add(this.txtUsername)
    this.container.add(this.txtSubtitle)
    this.container.add(this.txtTime)
  }

  displayState(state: GameModel): void {
    const i = this.playerIndex()
    this.avatar.setAvatar(state.cosmeticSets[i].avatar)
    this.avatar.setBorder(state.cosmeticSets[i].border)

    this.txtUsername.setText(state.usernames[i])

    const subtitle = state.subtitles[i]
    this.txtSubtitle.setText(subtitle).setVisible(!!subtitle)

    this.updateMatchClock(state, i)
  }

  beforeExit(): void {
    this.clearClockTimer()
  }

  private clearClockTimer(): void {
    if (this.clockTimer) {
      this.scene.time.removeEvent(this.clockTimer)
      this.clockTimer = null
    }
  }

  /**
   * PvP-only clock under the avatar. PvE hides this (no turn timer).
   * Uses `timers` + `lastTime` from the server snapshot (same idea as `GameModel.getPlayerTimeLeft`).
   */
  private updateMatchClock(state: GameModel, i: 0 | 1): void {
    this.clearClockTimer()

    if (!this.scene.params?.isPvp) {
      this.txtTime.setVisible(false)
      return
    }

    const timers = state.timers
    const lastTime = state.lastTime
    // Until we have a full snapshot, don't show a misleading value.
    if (
      !timers ||
      timers.length < 2 ||
      lastTime === undefined ||
      lastTime === null
    ) {
      this.txtTime.setVisible(false)
      return
    }

    this.txtTime.setVisible(true)

    // TODO Time should tick down during recap, but you need to be using the MOST RECENT STATE not just the last one shown.

    const inMulligan = state.mulligansComplete.includes(false)
    // Live countdown while this slot's clock is running on the server: their priority (including
    // during story recap — time still ticks), or mulligan not finished yet.
    // Otherwise show frozen `timers[i]` (opponent's turn or game over).
    const shouldLiveTick =
      state.winner === null &&
      // !state.isRecap &&
      (state.priority === i || (inMulligan && !state.mulligansComplete[i]))

    const applyText = () => {
      const ms = shouldLiveTick
        ? // Remaining ms: bucket at `lastTime` minus elapsed real time since then.
          Math.max(0, state.timers[i] - (Date.now() - state.lastTime))
        : state.timers[i]
      const totalSec = Math.max(0, Math.floor(ms / 1000))
      const m = Math.floor(totalSec / 60)
      const s = totalSec % 60
      this.txtTime.setText(`${m}:${s.toString().padStart(2, '0')}`)
    }
    applyText()

    // Recompute once per second while the clock is ticking; between states we get a fresh snapshot.
    if (shouldLiveTick) {
      this.clockTimer = this.scene.time.addEvent({
        delay: 1000,
        loop: true,
        callback: applyText,
      })
    }
  }
}
