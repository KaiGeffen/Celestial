import 'phaser'
import { Space } from '../../settings/settings'
import AvatarRegionBase from './avatarRegionBase'
import { MatchScene } from '../matchScene'
import GameModel from '@shared/state/gameModel'

export default class TheirAvatarRegion extends AvatarRegionBase {
  protected playerIndex(): 0 | 1 {
    return 1
  }

  protected avatarCenterY(): number {
    return Space.avatarSize / 2 + Space.pad
  }

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container(0, 0)

    this.createAvatar()
    this.createUsernames()

    return this
  }

  emote(emoteNumber: number): void {
    this.avatar.doEmote(emoteNumber)
  }

  setEmoteCallback(fEmote: () => void): void {
    this.avatar.setOnClick(fEmote, false, false)
  }

  // Umbra visuals
  private umbraShown = false
  displayState(state: GameModel): void {
    const username = state.usernames[this.playerIndex()]
    if (username === 'Umbra' && !this.umbraShown) {
      this.umbraShown = true
      this.setUmbra()
    }

    super.displayState(state)
  }

  // Creates the umbra portrait which animates
  private setUmbra(): void {
    const i = Math.floor(Math.random() * 2)

    // Remove the avatar icon
    this.avatar.setVisible(false)

    // Create the umbra sprite
    const icon = this.avatar.icon

    const sprite = this.scene.add
      .sprite(icon.x, icon.y - Space.padSmall, `avatar-umbra${i + 1}`, 0)
      .setOrigin(icon.originX, icon.originY)
    this.container.add(sprite)

    // Play the animation (Loops)
    sprite.play(`idle${i + 1}`)
  }
}
