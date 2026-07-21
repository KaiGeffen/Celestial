import 'phaser'
import { Space, Style, BBStyle } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import Buttons from '../../lib/buttons/buttons'
import Server from '../../server'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { AccountLinkSummary } from '@shared/network/messagesToClient'

const width = 600

// Shown when linking finds that both the Steam and Google identities already
// have accounts with progress. The user picks which one survives; the other is
// permanently closed.
export default class LinkAccountConflictMenu extends Menu {
  constructor(
    scene: MenuScene,
    params: { current: AccountLinkSummary; other: AccountLinkSummary },
  ) {
    super(scene, width)

    this.createContent(params.current, params.other)
    this.layout()
  }

  private createContent(
    current: AccountLinkSummary,
    other: AccountLinkSummary,
  ): void {
    this.createHeader('Two Accounts Found')

    this.createText(
      'Both accounts already have progress. Choose which one to keep, the other will be permanently closed.\nThis cannot be undone.',
    )
    this.sizer.addNewLine()

    // The two accounts side by side
    const row = this.scene.rexUI.add.sizer({ space: { item: Space.pad * 2 } })
    row.add(this.createAccountColumn(current))
    row.add(this.createAccountColumn(other))
    this.sizer.add(row)
    this.sizer.addNewLine()

    // Cancel on its own row (centered by the menu's center alignment)
    this.sizer.add(this.createCancelButton())
  }

  private createAccountColumn(account: AccountLinkSummary) {
    const column = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: Space.padSmall },
    })

    column
      // Plain text (not BBCode) so markup in a username renders literally
      .add(
        this.scene.add.text(0, 0, account.username, {
          ...Style.basicStylized,
          fontStyle: 'bold',
        }),
      )
      .add(
        this.scene.add.rexBBCodeText(
          0,
          0,
          `${account.coins} coins`,
          BBStyle.basicStylized,
        ),
      )
      .add(
        this.scene.add.rexBBCodeText(
          0,
          0,
          `${account.gems} gems`,
          BBStyle.basicStylized,
        ),
      )
      .add(
        this.scene.add.rexBBCodeText(
          0,
          0,
          `${account.deckCount} decks`,
          BBStyle.basicStylized,
        ),
      )

    const container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: container,
      text: 'Keep',
      f: () => {
        Server.confirmAccountLink(account.id)
        this.close()
      },
      muteClick: true,
    })
    column.add(container)

    return column
  }
}
