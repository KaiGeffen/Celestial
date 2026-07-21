import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'

import { BBStyle, Space, Color } from '../../settings/settings'
import MenuScene from '../menuScene'
import Buttons from '../../lib/buttons/buttons'

export default class Menu {
  // The scene which contains only this menu
  scene: MenuScene

  // The callback for when this menu is closed
  exitCallback: () => void

  // The width of this menu
  width: number

  // The main panel for this menu
  sizer: RexUIPlugin.FixWidthSizer

  constructor(
    scene: MenuScene,
    width: number = Space.windowWidth - Space.pad * 2,
    params?,
  ) {
    this.scene = scene

    this.width = width

    if (params) {
      this.exitCallback = params.exitCallback
    }

    if (width > 0) {
      // Create the basic sizer
      this.createSizer()
    }
  }

  close() {
    if (this.exitCallback) {
      this.exitCallback()
    }

    this.endScene()
  }

  // Called every frame from MenuScene; override in subclasses
  update(time: number, delta: number): void {}

  protected endScene(): void {
    // TODO Confusing that it returns a callback that has to be called
    this.scene.endScene()()
  }

  protected layout(): void {
    this.sizer.layout()
  }

  // Create the menu header
  protected createHeader(
    s: string,
    width: number = this.width,
    style: BBCodeText.TextStyle = BBStyle.header,
  ): any {
    const background = this.scene.add.image(0, 0, 'chrome-header')

    const sizer = this.scene.rexUI.add
      .sizer({
        width,
        orientation: 0,
        space: {
          top: Space.padSmall,
          bottom: Space.padSmall,
        },
      })
      .addBackground(background)

    const txt = this.scene.add.rexBBCodeText(
      0,
      0,
      `[stroke]${s}[/stroke]`,
      style,
    )
    sizer.addSpace().add(txt).addSpace()

    // TODO Rasterize shadow
    // Background shadow
    this.scene.addShadow(background, -90)

    // Add the sizer to the main menu sizer
    this.sizer.add(sizer).addNewLine()

    return sizer
  }

  protected createSizer(): void {
    this.sizer = this.scene.rexUI.add.fixWidthSizer({
      x: Space.windowWidth / 2,
      y: Space.windowHeight / 2,
      width: this.width,

      align: 'center',

      space: {
        bottom: Space.pad,
        line: Space.pad,
      },
    })

    const strokeBg = this.scene.add
      .rectangle(0, 0, 1, 1)
      .setStrokeStyle(3, Color.backgroundStroke)
    this.sizer.addBackground(strokeBg)

    const bodyBg = this.scene.add.image(0, 0, 'chrome-body').setInteractive()
    this.sizer.addBackground(bodyBg)

    // Anchor in center of screen
    this.scene.plugins.get('rexAnchor')['add'](this.sizer, {
      x: `50%`,
      y: `50%`,
    })
  }

  // Create a generic cancel button
  protected createCancelButton(): ContainerLite {
    let container = new ContainerLite(this.scene, 0, 0, Space.buttonWidth, 50)

    new Buttons.Basic({
      within: container,
      text: 'Cancel',
      f: () => {
        this.close()
      },
      muteClick: true,
    })

    return container
  }

  // Add the given string as text to the sizer
  protected createText(s: string): void {
    const width = this.width - Space.pad * 2

    const txt = this.scene.add.rexBBCodeText(0, 0, s, {
      ...BBStyle.basicStylized,
      wordWrap: { width },
    })
    this.sizer.add(txt)
  }

  // A row with Cancel on the left and a primary confirm button on the right
  protected createConfirmCancelRow(
    label: string,
    onConfirm: () => void,
    opts: { width?: number; muteClick?: boolean } = {},
  ): RexUIPlugin.Sizer {
    const sizer = this.scene.rexUI.add.sizer({
      width: opts.width ?? this.width - Space.pad * 2,
      space: { item: Space.pad, left: Space.pad, right: Space.pad },
    })

    const confirmContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      50,
    )
    new Buttons.Basic({
      within: confirmContainer,
      text: label,
      f: () => {
        onConfirm()
        this.close()
      },
      returnHotkey: true,
      muteClick: opts.muteClick ?? false,
    })

    return sizer.add(this.createCancelButton()).addSpace().add(confirmContainer)
  }
}

import OptionsMenu from './options'
import AlterDeckCosmeticsMenu from './alterDeckCosmetics'
import TextEntryMenu from './textEntry'
import ConfirmMenu from './confirm'
import MessageMenu from './message'
import ChapterMessageMenu from './chapterMessage'
import ChoiceChapterMessageMenu from './choiceChapterMessage'
import LeaderboardMenu from './leaderboard'
import OnlinePlayersMenu from './onlinePlayers'
import { RegisterUsernameMenu } from './registerUsername'
import PurchaseItemMenu from './purchaseItem'
import UserProfileMenu from './userProfile'
import AchievementsMenu from './achievements'
import RaceCardChoiceMenu from './raceCardChoice'
import RaceDeckReplacementMenu from './raceDeckReplacement'
import RaceDeckSelectionMenu from './raceDeckSelection'
import RaceCardUpgradeMenu from './raceCardUpgrade'
import RaceSpecialModesMenu from './raceSpecialModes'
import PlayMenu from './play'
import LinkAccountConflictMenu from './linkAccountConflict'
import BBCodeText from 'phaser3-rex-plugins/plugins/bbcodetext'

const menus = {
  options: OptionsMenu,
  play: PlayMenu,

  alterDeckCosmetics: AlterDeckCosmeticsMenu,
  textEntry: TextEntryMenu,

  confirm: ConfirmMenu,
  message: MessageMenu,

  // Chapters TODO
  chapterMessage: ChapterMessageMenu,
  choiceChapterMessage: ChoiceChapterMessageMenu,

  leaderboard: LeaderboardMenu,
  onlinePlayers: OnlinePlayersMenu,
  purchaseItem: PurchaseItemMenu,
  userProfile: UserProfileMenu,
  linkAccountConflict: LinkAccountConflictMenu,
  achievements: AchievementsMenu,
  registerUsername: RegisterUsernameMenu,

  // RACE COMING SOON (tm)
  raceCardChoice: RaceCardChoiceMenu,
  raceDeckReplacement: RaceDeckReplacementMenu,
  raceDeckSelection: RaceDeckSelectionMenu,
  raceCardUpgrade: RaceCardUpgradeMenu,
  raceSpecialModes: RaceSpecialModesMenu,
}

// Function exposed for the creation of custom menus
export function createMenu(scene: Phaser.Scene, title: string, params): Menu {
  // Check if the given menu exists, if not throw
  if (!(title in menus)) {
    throw `Given menu ${title} is not in list of implemented menus.`
  }

  return new menus[title](scene, params)
}
