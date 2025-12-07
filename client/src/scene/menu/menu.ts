import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'

import { Style, Color, Space } from '../../settings/settings'
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

  protected endScene(): void {
    // TODO Confusing that it returns a callback that has to be called
    this.scene.endScene()()
  }

  protected layout(): void {
    this.sizer.layout()
  }

  // Create the menu header
  protected createHeader(s: string, width: number = this.width): any {
    let background = this.scene.add.rectangle(0, 0, 1, 1, Color.backgroundLight)

    let sizer = this.scene.rexUI.add.sizer({
      width: width,
      space: { top: Space.padSmall, bottom: Space.padSmall },
    })
    sizer.addBackground(background)

    let txt = this.scene.add.text(0, 0, s, Style.announcement)
    sizer.addSpace().add(txt).addSpace()

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
        // left: Space.pad,
        // right: Space.pad,
        bottom: Space.pad,
        line: Space.pad,
      },
    })

    // Add background
    let rect = this.scene.rexUI.add
      .roundRectangle(0, 0, 1, 1, Space.corner, Color.backgroundDark, 1)
      .setInteractive()
    this.sizer.addBackground(rect)

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
  protected createText(s: string): any {
    const width = this.width - Space.pad * 2
    let sizer = this.scene.rexUI.add.sizer({ width: width })

    let txt = this.scene.add.text(0, 0, s, Style.basic).setWordWrapWidth(width)

    sizer.addSpace().add(txt).addSpace()

    // Add this new sizer to the main sizer
    const padding = {
      padding: {
        left: Space.pad,
        right: Space.pad,
      },
    }

    this.sizer.add(sizer, padding).addNewLine()

    return sizer
  }
}

import OptionsMenu from './options'
import ChoosePremade from './choosePremade'
import CreditsMenu from './credits'
import RulebookMenu from './rulebook'
import { NewDeckMenu, EditDeckMenu } from './alterDeck'
import ModeMenu from './mode'
import ConfirmMenu from './confirm'
import MessageMenu from './message'
import FocusMenu from './focus'
import SearchMenu from './search'
import LeaderboardMenu from './leaderboard'
import { RegisterUsernameMenu } from './registerUsername'
import PurchaseGemsMenu from './purchaseGems'
import PurchaseItemMenu from './purchaseItem'
import UserProfileMenu from './userProfile'
import AchievementsMenu from './achievements'
import RaceCardChoiceMenu from './raceCardChoice'
import RaceDeckReplacementMenu from './raceDeckReplacement'
import RaceDeckSelectionMenu from './raceDeckSelection'
import RaceCardUpgradeMenu from './raceCardUpgrade'
import RaceSpecialModesMenu from './raceSpecialModes'

const menus = {
  options: OptionsMenu,
  choosePremade: ChoosePremade,
  credits: CreditsMenu,
  rulebook: RulebookMenu,
  newDeck: NewDeckMenu,
  mode: ModeMenu,
  editDeck: EditDeckMenu,
  confirm: ConfirmMenu,
  message: MessageMenu,
  focus: FocusMenu,
  search: SearchMenu,
  leaderboard: LeaderboardMenu,
  registerUsername: RegisterUsernameMenu,
  purchaseGems: PurchaseGemsMenu,
  purchaseItem: PurchaseItemMenu,
  userProfile: UserProfileMenu,
  achievements: AchievementsMenu,
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
