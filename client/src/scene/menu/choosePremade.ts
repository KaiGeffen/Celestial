import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'
import avatarDetails from '../../data/avatarDetails.json'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import Hint from '../../lib/hint'
import {
  BBStyle,
  Color,
  Space,
  Style,
  Time,
  Flags,
} from '../../settings/settings'
import MenuScene from '../menuScene'
import Menu from './menu'
import newScrollablePanel from '../../lib/scrollablePanel'

export default class ChoosePremade extends Menu {
  selectedAvatar = 0

  avatarsSmall: Button[]
  avatarFull: Phaser.GameObjects.Image
  txtName: Phaser.GameObjects.Text
  txtSurname: Phaser.GameObjects.Text
  txtDescription: RexUIPlugin.BBCodeText

  chart: any

  scrollablePanel: RexUIPlugin.ScrollablePanel

  constructor(scene: MenuScene, params) {
    let callback: (number) => void = params.callback
    super(scene, Space.windowWidth, params)

    // Add a background rectangle
    this.scene.add
      .rectangle(
        0,
        0,
        Space.windowWidth,
        Space.windowHeight,
        Color.backgroundDark,
      )
      .setOrigin(0)
      .setInteractive()

    this.avatarsSmall = []

    this.createContent(callback)

    // Set the content based on the selected avatar
    this.setContent(avatarDetails[this.selectedAvatar])

    this.layout()
  }

  // This menu has a custom sizer that fills the whole screen and has different spacing
  protected createSizer(): void {
    this.sizer = this.scene.rexUI.add
      .fixWidthSizer({
        width: Space.windowWidth,
        space: {
          // left: Space.pad,
          right: Space.pad,
          bottom: Space.pad,
          // line: Space.pad,
        },
      })
      .setOrigin(0)
  }

  private createContent(callback: (number) => void): void {
    this.sizer
      .add(this.createCustomHeader())
      .addNewLine()
      .add(this.createPanel())

    this.createButtons(callback).layout()

    // Create chart showing details about selected deck
    if (!Flags.mobile) {
      // Must layout first to tell chart dimensions
      this.sizer.layout()
      this.createChart()
    }
  }

  private createCustomHeader(): any {
    let background = this.scene.add.rectangle(
      0,
      0,
      420,
      420,
      Color.backgroundLight,
    )

    let panel = this.scene.rexUI.add
      .sizer({
        width: Space.windowWidth,
        space: {
          top: Space.pad,
          bottom: Space.pad,
        },
      })
      .addBackground(background)

    // Add each of the avatars
    panel.addSpace()
    for (let i = 0; i < avatarDetails.length; i++) {
      let container = new ContainerLite(
        this.scene,
        0,
        0,
        Space.avatarSize,
        Space.avatarSize,
      )
      this.avatarsSmall[i] = new Buttons.Avatar({
        within: container,
        avatarId: i,
        f: () => {
          // Set which avatar is selected
          this.selectedAvatar = i
          this.avatarsSmall.forEach((a) => a.deselect())
          this.avatarsSmall[i].select()

          // Adjust displayed content
          this.setContent(avatarDetails[i])

          // Scroll up the content
          this.scrollablePanel?.scrollToTop()
          this.sizer.layout()
        },
      })

      // Select this avatar if appropriate
      if (i === this.selectedAvatar) {
        this.avatarsSmall[i].select()
      } else {
        this.avatarsSmall[i].deselect()
      }

      panel.add(container).addSpace()
    }

    // Give the background a drop shadow
    this.scene.addShadow(background, -90)

    return panel
  }

  // Create all of the content about the selected character
  private createPanel(): any {
    let panel = this.scene.rexUI.add.sizer({
      space: {
        left: Space.pad,
        bottom: Space.buttonHeight + Space.padSmall,
        item: Space.pad,
      },
    })

    this.avatarFull = this.scene.add.image(
      0,
      0,
      `avatar-${avatarDetails[0].name}Full`,
    )

    panel
      .add(this.avatarFull, { align: 'top' })
      .add(this.createDescriptionText(), { align: 'top', expand: Flags.mobile })

    return panel
  }

  private createDescriptionText(): any {
    let panel = this.scene.rexUI.add.fixWidthSizer({
      space: {
        bottom: Flags.mobile ? Space.buttonHeight * 2 : 0,
      },
    })

    // Hint on which information is displayed
    let hint = new Hint(this.scene)

    this.txtName = this.scene.add.text(0, 0, '', Style.announcement)
    this.txtSurname = this.scene.add.text(0, 0, '', Style.surname)

    const width = Math.min(
      Space.maxTextWidth + Space.padSmall * 2,
      Space.windowWidth - Space.avatarWidth - Space.pad * 3,
    )
    this.txtDescription = this.scene.rexUI.add
      .BBCodeText(0, 0, '', BBStyle.description)
      .setWrapWidth(
        width -
          BBStyle.description.padding.left -
          BBStyle.description.padding.right,
      )
      .setInteractive()
    if (!Flags.mobile) {
      this.txtDescription
        .setFixedSize(width, 360)
        .on('areaover', function (key: string) {
          if (key[0] === '_') {
            hint.showCard(key.slice(1))
          } else {
            hint.showKeyword(key)
          }
        })
        .on('areaout', () => {
          hint.hide()
        })
    }

    // Add all this text to the panel
    panel
      .add(this.txtName)
      .addNewLine()
      .add(this.txtSurname)
      .addNewLine()
      .add(this.txtDescription)

    // On mobile panel is within a scroller
    if (Flags.mobile) {
      return (this.scrollablePanel = newScrollablePanel(this.scene, {
        width: width,
        panel: {
          child: panel,
        },
      }))
    }

    return panel
  }

  private createButtons(callback: (number) => void): any {
    const width = Flags.mobile
      ? this.scrollablePanel.width
      : this.txtDescription.displayWidth

    let panel = this.scene.rexUI.add
      .sizer({
        x: this.avatarFull.displayWidth + Space.pad * 2,
        y: Space.windowHeight - Space.pad,
        width: width,
        space: {
          item: Space.pad,
        },
      })
      .setOrigin(0, 1)

    let c1 = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    let btnCancel = new Buttons.Basic({
      within: c1,
      text: 'Cancel',
      f: () => {
        this.close()
      },
      muteClick: true,
    })
    panel.add(c1).addSpace()

    let c2 = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    let btnSelect = new Buttons.Basic({
      within: c2,
      text: 'Select',
      f: () => {
        callback(this.selectedAvatar)
        this.close()
      },
      muteClick: true,
      returnHotkey: true,
    })
    panel.add(c2)
    // .addSpace()

    return panel
  }

  private createChart(): void {
    const availableWidth =
      Space.windowWidth - (this.txtDescription.getBounds().right + Space.pad)
    const width = Math.min(450, availableWidth)
    const height = width
    // let space = Space.windowHeight - Space.pad * 3 - Space.avatarSize
    // let ratio = space / this.avatarFull.height
    // this.avatarFull.setScale(ratio)

    // NOTE Necessary because type definition has wrong list of parameters for chart
    const factory: any = this.scene.rexUI.add
    this.chart = factory
      .chart(
        Space.windowWidth,
        Space.avatarSize + Space.pad * 2,
        width,
        height,
        {
          type: 'radar',
          data: {
            labels: ['Difficulty', 'Speed', 'Control', 'Max Points', 'Combos'],
            datasets: [
              {
                label: '',
                borderColor: Color.radar,
                pointBackgroundColor: Color.radar,
                data: [1, 1, 1, 1, 1],
              },
            ],
          },
          options: {
            animation: {
              duration: Time.chart,
              easing: 'easeOutQuint',
            },
            plugins: {
              legend: {
                display: false,
              },
            },
            scales: {
              r: {
                min: 0,
                max: 5,
                ticks: {
                  stepSize: 1,
                  display: false,
                },
                pointLabels: {
                  font: {
                    size: 20,
                  },
                },
              },
            },
          },
        },
      )
      .setOrigin(1, 0)
      .setAlpha(width <= 300 ? 0 : 1)
  }

  // Populate the content objects with the given avatar details
  private setContent(details): void {
    // Image
    this.avatarFull.setTexture(`avatar-${details.name}Full`)

    // Text
    this.txtName.setText(`${details.name}`)
    this.txtSurname.setText(`${details.surname}`)
    this.txtDescription.setText(`${details.description}`)

    // Chart
    if (this.chart) {
      for (let i = 0; i < details.chart.length; i++) {
        this.chart.setChartData(0, i, details.chart[i])
      }
      this.chart.updateChart()
    }
  }
}
