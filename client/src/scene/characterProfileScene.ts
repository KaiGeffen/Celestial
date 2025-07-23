import 'phaser'
import BaseScene from './baseScene'
import { Style, Space, Color, UserSettings } from '../settings/settings'
import Buttons from '../lib/buttons/buttons'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'
import avatarNames from '../lib/avatarNames'
import AvatarButton from '../lib/buttons/avatar'
import { getUnlockedAvatars } from '../lib/cosmetics'
import avatarDescriptions from '../data/avatarDescriptions'
import { createExpBar } from '../lib/expBar'
import ExpBar from 'phaser3-rex-plugins/templates/ui/expbar/ExpBar'
import { getCharacterLevel } from '../data/levelProgression'

export default class CharacterProfileScene extends BaseScene {
  // Character details
  selectedAvatar = 0
  fullAvatar: Phaser.GameObjects.Image
  avatar: AvatarButton
  txtCharacterName: Phaser.GameObjects.Text
  txtCharacterDescription: Phaser.GameObjects.Text
  expBar: ExpBar

  // Views
  sizer: Sizer

  constructor() {
    super({
      key: 'CharacterProfileScene',
    })
  }

  create(): void {
    super.create()

    // Main sizer that takes up full page
    this.sizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: Space.pad },
      anchor: {
        x: 'center',
        y: 'center',
        width: '100%',
        height: '100%',
      },
    })

    // Add both sides to the main sizer
    this.sizer
      .addBackground(this.createBackground())
      .add(this.createLeftSide())
      .add(this.createRightSide())
      .layout()

    // Add back button
    new Buttons.Basic({
      within: this,
      x: Space.buttonWidth / 2 + Space.pad,
      y: Space.buttonHeight / 2 + Space.pad,
      text: 'Back',
      f: () => this.scene.start('HomeScene'),
    })
  }

  private createLeftSide(): Phaser.GameObjects.Image {
    // Create the full art image
    this.fullAvatar = this.add.image(
      0,
      0,
      `avatar-${avatarNames[this.selectedAvatar]}Full`,
    )

    return this.fullAvatar
  }

  private createRightSide(): Sizer {
    // Create the right side content - vertically divided into 3 parts
    const sizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: Space.pad * 2 },
    })

    // Create avatar selection row
    const avatarSizer = this.createAvatarSelection()

    // Create character description
    const descriptionSizer = this.createDescription()

    // Create exp bar
    this.expBar = createExpBar(this, this.selectedAvatar)

    // Add all elements to the right sizer
    sizer.add(avatarSizer).add(descriptionSizer).add(this.expBar)

    return sizer
  }

  private createBackground(): Phaser.GameObjects.Image {
    return this.add.image(0, 0, 'background-Light')
  }

  private createAvatarSelection(): Sizer {
    const sizer = this.rexUI.add.sizer({
      space: {
        item: Space.pad,
        left: Space.pad,
        right: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
      },
    })

    // Get unlocked avatars
    const unlockedAvatars = getUnlockedAvatars()

    // Create avatar buttons
    unlockedAvatars.forEach((avatarId) => {
      const container = new ContainerLite(
        this,
        0,
        0,
        Space.avatarSize,
        Space.avatarSize,
      )
      const avatar = new Buttons.Avatar({
        within: container,
        avatarId: avatarId,
        f: () => {
          this.selectedAvatar = avatarId
          this.updateCharacterView()
        },
      })

      if (avatarId === this.selectedAvatar) {
        avatar.select()
      }

      sizer.add(container)
    })

    return sizer
  }

  private createDescription(): Sizer {
    const sizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: Space.pad },
    })

    this.txtCharacterName = this.add.text(0, 0, '', Style.announcement)
    this.txtCharacterDescription = this.add.text(0, 0, '', {
      ...Style.basic,
      wordWrap: { width: 400 },
    })

    sizer.add(this.txtCharacterName).add(this.txtCharacterDescription)

    // Update text with initial values
    this.updateCharacterText()

    return sizer
  }

  private updateCharacterView() {
    // Update the full art image
    this.fullAvatar.setTexture(`avatar-${avatarNames[this.selectedAvatar]}Full`)

    // Update the text
    this.updateCharacterText()

    // Update progress bar
    this.expBar.setExp(0)
    // this.expBar.setExp(
    //   UserSettings._get('avatarExperience')[this.selectedAvatar],
    // )
  }

  private updateCharacterText() {
    this.txtCharacterName.setText(avatarNames[this.selectedAvatar])
    this.txtCharacterDescription.setText(
      avatarDescriptions[this.selectedAvatar],
    )
  }
}
