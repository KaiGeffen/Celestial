import 'phaser'
import BaseScene from './baseScene'
import { Style, Space, Color, UserSettings } from '../settings/settings'
import Buttons from '../lib/buttons/buttons'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'
import avatarNames from '../lib/avatarNames'
import AvatarButton from '../lib/buttons/avatar'
import { getUnlockedAvatars } from '../lib/cosmetics'
import {
  getLevelFromExp,
  getLevelProgress,
  getExpToNextLevel,
  MAX_LEVEL,
} from '../data/levelProgression'

export default class CharacterProfileScene extends BaseScene {
  // Character details
  selectedAvatar: number
  avatar: AvatarButton
  txtCharacterName: Phaser.GameObjects.Text
  txtCharacterDescription: Phaser.GameObjects.Text
  expBar: any
  expLabel: Phaser.GameObjects.Text

  // Views
  mainSizer: Sizer
  rightSizer: Sizer

  constructor() {
    super({
      key: 'CharacterProfileScene',
    })
  }

  create(params): void {
    super.create()

    // Default to first avatar if none selected
    this.selectedAvatar = params?.avatarId ?? 0

    // Create the main layout
    this.createMainLayout()

    // Add back button
    new Buttons.Basic({
      within: this,
      x: Space.buttonWidth / 2 + Space.pad,
      y: Space.buttonHeight / 2 + Space.pad,
      text: 'Back',
      f: () => this.scene.start('HomeScene'),
    })
  }

  private createMainLayout() {
    // Create the main sizer that will contain everything
    this.mainSizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: Space.pad * 2 },
      anchor: {
        x: '50%',
        y: '50%',
        width: '100%',
        height: '100%',
      },
    })

    // Add background
    const background = this.add.image(0, 0, 'background-Light').setInteractive()

    // Create the full art image
    const image = this.add
      .image(0, 0, `avatar-${avatarNames[this.selectedAvatar]}Full`)
      .setInteractive()

    // Create the right side content
    this.rightSizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: Space.pad * 2 },
    })

    // Create avatar selection row
    const avatarSizer = this.createAvatarSelection()

    // Create character description
    const descriptionSizer = this.createDescription()

    // Create progress bar
    const progressSizer = this.createProgressBar()

    // Add all elements to the right sizer
    this.rightSizer
      .add(avatarSizer)
      .add(descriptionSizer)
      .add(progressSizer)
      .addSpace()
      .layout()

    // Add both the image and right content to the main sizer
    this.mainSizer
      .add(image)
      .add(this.rightSizer)
      .addBackground(background)
      .layout()
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

  private createProgressBar(): Sizer {
    const sizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: Space.pad },
    })

    const avatarExp =
      UserSettings._get('avatarExperience')[this.selectedAvatar] || 0
    const levelData = getLevelFromExp(avatarExp)
    const progress = getLevelProgress(avatarExp)
    const expToNext = getExpToNextLevel(avatarExp)

    this.expBar = this.add
      .rexLineProgress({
        width: 400,
        height: 10,
        barColor: Color.progressBar,
        trackColor: Color.progressBarTrack,
        trackStrokeColor: Color.progressBarTrackStroke,
        trackStrokeThickness: 4,
        value: progress,
        valuechangeCallback: () => {},
      })
      .setAlpha(0.4)

    this.expLabel = this.add.text(
      0,
      0,
      levelData.level === MAX_LEVEL
        ? `Level ${levelData.level} (MAX)`
        : `Level ${levelData.level} - ${expToNext} EXP to next\nClick to unlock TODO UNLOCKS`,
      {
        ...Style.basic,
        fontSize: '16px',
      },
    )

    sizer.add(this.expBar).add(this.expLabel)

    return sizer
  }

  private updateCharacterView() {
    // Update the full art image
    const image = this.mainSizer.getChildren()[0] as Phaser.GameObjects.Image
    image.setTexture(`avatar-${avatarNames[this.selectedAvatar]}Full`)

    // Update the text
    this.updateCharacterText()

    // Update progress bar
    this.updateProgressBar()
  }

  private updateCharacterText() {
    this.txtCharacterName.setText(avatarNames[this.selectedAvatar])
    this.txtCharacterDescription.setText(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    )
  }

  private updateProgressBar() {
    const avatarExp =
      UserSettings._get('avatarExperience')[this.selectedAvatar] || 0
    const levelData = getLevelFromExp(avatarExp)
    const progress = getLevelProgress(avatarExp)
    const expToNext = getExpToNextLevel(avatarExp)

    this.expBar.setValue(progress)
    this.expLabel.setText(
      levelData.level === MAX_LEVEL
        ? `Level ${levelData.level} (MAX)`
        : `Level ${levelData.level} - ${expToNext} EXP to next\nClick to unlock TODO UNLOCKS`,
    )
  }
}
