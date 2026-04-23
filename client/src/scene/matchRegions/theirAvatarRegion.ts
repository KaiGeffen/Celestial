import 'phaser'
import { Depth, Space } from '../../settings/settings'
import AvatarRegionBase from './avatarRegionBase'
import { MatchScene } from '../matchScene'

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

  // Show their avatar using the given emote
  emote(emoteNumber: number): void {
    this.avatar.doEmote(emoteNumber)
  }

  setEmoteCallback(fEmote: () => void): void {
    this.avatar.setOnClick(fEmote, false, false)
  }
}
