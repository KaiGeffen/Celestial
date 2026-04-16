import 'phaser'
import { Depth, Space } from '../../settings/settings'
import AvatarRegionBase from './avatarRegionBase'
import { MatchScene } from '../matchScene'

const height = 240

export default class OurAvatarRegion extends AvatarRegionBase {
  protected playerIndex(): 0 | 1 {
    return 0
  }

  protected avatarCenterY(): number {
    return Space.pad * 2 + Space.avatarSize / 2
  }

  protected avatarEmotive(): boolean {
    return true
  }

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container().setDepth(Depth.ourAvatar)
    this.scene.plugins.get('rexAnchor')['add'](this.container, {
      y: `100%-${height}`,
    })

    this.createAvatar()
    this.createUsernames()

    return this
  }

  setEmoteCallback(fEmote: () => void): void {
    this.avatar.setOnClick(fEmote, false, false)
  }
}
