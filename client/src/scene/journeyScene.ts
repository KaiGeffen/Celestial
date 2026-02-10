import 'phaser'
import BaseScene from './baseScene'
import {
  Style,
  Space,
  Color,
  UserSettings,
  Time,
  Ease,
  Flags,
} from '../settings/settings'
import Buttons from '../lib/buttons/buttons'

import Catalog from '../../../shared/state/catalog'
import { journeyNode, getMissionsByTheme } from '../journey/journey'
import Loader from '../loader/loader'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'
import newScrollablePanel from '../lib/scrollablePanel'

const OVERLAY_WIDTH = 540
const OVERLAY_TOP = 100

/** Camera center position (x, y) per overlay theme, in theme order: Jules, Adonis, Mia, Kitz, Imani, Mitra, Water */
const THEME_CAMERA_POSITIONS: { x: number; y: number }[] = [
  { x: 4000, y: 670 }, // birds (Jules)
  { x: 2100, y: 1270 }, // ashes (Adonis)
  { x: 4860, y: 1940 }, // shadow (Mia)
  { x: 1260, y: 2250 }, // pet (Kitz)
  { x: 1590, y: 4140 }, // birth (Imani)
  { x: 4850, y: 4130 }, // vision (Mitra)
  { x: 3180, y: 3100 }, // water
]

const DRIFT_RADIUS_X = 150
const DRIFT_RADIUS_Y = 80
const DRIFT_SPEED = 0.0003
const DRIFT_PHASE = 1.3

export default class JourneyScene extends BaseScene {
  map: Phaser.GameObjects.Image

  /** Center point the camera drifts around (theme position) */
  private driftCenterX = 0
  private driftCenterY = 0

  private selectedThemeIndex = 0
  private overlayHeaderText: Phaser.GameObjects.Text
  private overlayPanel: ScrollablePanel

  constructor() {
    super({
      key: 'JourneyScene',
    })
  }

  preload(): void {
    Loader.loadJourneyMapAndMission(this)
  }

  create(params): void {
    super.create()

    // Create the background
    this.map = this.add.image(0, 0, 'journey-Map').setOrigin(0)

    this.cameras.main.setBounds(0, 0, this.map.width, this.map.height)

    // Add buttons
    this.createHelpButton()
    this.createBackButton()

    // Add race button if dev mode is enabled
    if (Flags.devCardsEnabled) {
      this.createRaceButton()
    }

    if (params.stillframe !== undefined) {
      this.createStillframe(params)
    }

    // Make up pop-up for the card you just received, if there is one
    if (params.card) {
      this.createCardPopup(params)
    } else if (params.txt) {
      this.createTipPopup(params)
    }

    const coords = UserSettings._get('journeyCoordinates')
    const camera = this.cameras.main
    camera.scrollX = coords.x
    camera.scrollY = coords.y
    this.driftCenterX = camera.scrollX + camera.width / 2
    this.driftCenterY = camera.scrollY + camera.height / 2

    // Mission list overlay on the right
    this.createJourneyOverlay()
  }

  update(time: number, _delta: number): void {
    const camera = this.cameras.main
    const offsetX = Math.sin(time * DRIFT_SPEED) * DRIFT_RADIUS_X
    const offsetY =
      Math.sin(time * DRIFT_SPEED * 0.7 + DRIFT_PHASE) * DRIFT_RADIUS_Y
    camera.scrollX = Phaser.Math.Clamp(
      this.driftCenterX - camera.width / 2 + offsetX,
      0,
      Math.max(0, this.map.width - camera.width),
    )
    camera.scrollY = Phaser.Math.Clamp(
      this.driftCenterY - camera.height / 2 + offsetY,
      0,
      Math.max(0, this.map.height - camera.height),
    )
    JourneyScene.rememberCoordinates(camera)
  }

  private createJourneyOverlay(): void {
    const themes = getMissionsByTheme()
    const overlayHeight = Space.windowHeight - OVERLAY_TOP - Space.pad

    const contentSizer = this.rexUI.add.fixWidthSizer({
      width: OVERLAY_WIDTH,
      space: { item: 6 },
    })

    this.overlayPanel = newScrollablePanel(this, {
      x: Space.windowWidth - OVERLAY_WIDTH - Space.pad,
      y: OVERLAY_TOP,
      width: OVERLAY_WIDTH,
      height: overlayHeight,
      scrollMode: 0,
      background: this.add.rectangle(0, 0, 1, 1, 0xcbc1a8, 0.96).setOrigin(0),
      header: this.createOverlayHeader(themes),
      panel: { child: contentSizer },
      space: { header: 0 },
    })
    this.overlayPanel.setScrollFactor(0)
    this.refreshOverlayContent()
  }

  private createOverlayHeader(
    themes: ReturnType<typeof getMissionsByTheme>,
  ): Phaser.GameObjects.GameObject {
    const headerBg = this.add
      .rectangle(0, 0, 420, 420, 0x353f4e, 1)
      .setOrigin(0)
      .setInteractive()
    const headerSizer = this.rexUI.add
      .sizer({
        orientation: 'horizontal',
        width: OVERLAY_WIDTH,
        space: { left: 12, right: 12, top: 14, bottom: 14 },
      })
      .addBackground(headerBg)

    this.overlayHeaderText = this.add
      .text(0, 0, '', {
        ...Style.announcement,
        fontSize: '24px',
        color: '#f5f2eb',
      })
      .setOrigin(0.5, 0.5)

    const leftArrow = this.add
      .text(0, 0, '‹', { ...Style.basic, fontSize: '32px', color: '#f5f2eb' })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })
    leftArrow.on('pointerdown', () => {
      this.sound.play('click')
      this.selectedThemeIndex =
        (this.selectedThemeIndex - 1 + themes.length) % themes.length
      this.refreshOverlayContent()
    })
    const rightArrow = this.add
      .text(0, 0, '›', { ...Style.basic, fontSize: '32px', color: '#f5f2eb' })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })
    rightArrow.on('pointerdown', () => {
      this.sound.play('click')
      this.selectedThemeIndex = (this.selectedThemeIndex + 1) % themes.length
      this.refreshOverlayContent()
    })

    headerSizer
      .add(leftArrow, { align: 'center' })
      .addSpace()
      .add(this.overlayHeaderText, { proportion: 1, align: 'center' })
      .addSpace()
      .add(rightArrow, { align: 'center' })
    headerSizer.layout()
    return headerSizer
  }

  private refreshOverlayContent(): void {
    const themes = getMissionsByTheme()
    const theme = themes[this.selectedThemeIndex]
    const completed: boolean[] = UserSettings._get('completedMissions')
    const completedCount = theme.missions.filter((m) => completed[m.id]).length
    this.overlayHeaderText.setText(
      `${theme.displayName} (${completedCount}/${theme.missions.length})`,
    )
    const panel = this.overlayPanel.getElement('panel') as FixWidthSizer
    panel.removeAll(true)
    theme.missions.forEach((mission) => {
      const row = this.createMissionOverlayRow(mission, completed)
      panel.add(row)
    })
    panel.layout()
    this.overlayPanel.layout()
    this.moveCameraToTheme(this.selectedThemeIndex)
  }

  private moveCameraToTheme(themeIndex: number): void {
    const pos = THEME_CAMERA_POSITIONS[themeIndex]
    if (!pos) return
    this.driftCenterX = pos.x
    this.driftCenterY = pos.y
    const camera = this.cameras.main
    camera.centerOn(pos.x, pos.y)
    camera.scrollX = Phaser.Math.Clamp(
      camera.scrollX,
      0,
      Math.max(0, this.map.width - camera.width),
    )
    camera.scrollY = Phaser.Math.Clamp(
      camera.scrollY,
      0,
      Math.max(0, this.map.height - camera.height),
    )
    JourneyScene.rememberCoordinates(camera)
  }

  private isMissionUnlocked(
    mission: journeyNode,
    completed: boolean[],
  ): boolean {
    return mission.prereq.some((prereqs) =>
      prereqs.every((id) => completed[id]),
    )
  }

  private getMissionDisplayName(mission: journeyNode): string {
    if ('deck' in mission && mission.storyTitle) return mission.storyTitle
    return mission.name
  }

  private createMissionOverlayRow(
    mission: journeyNode,
    completed: boolean[],
  ): Phaser.GameObjects.GameObject {
    const rowWidth = OVERLAY_WIDTH
    const row = this.rexUI.add.sizer({
      orientation: 'horizontal',
      width: rowWidth,
      space: { left: 4, right: 4, top: 4, bottom: 4 },
    })

    const rowBg = this.add.rectangle(0, 0, 1, 1, 0xf5f2eb, 0.5).setOrigin(0)
    row.addBackground(rowBg)

    const isCompleted = completed[mission.id]
    const isUnlocked = this.isMissionUnlocked(mission, completed)

    // Checkmark or empty space
    const checkText = this.add
      .text(0, 0, isCompleted ? '✓' : ' ', {
        ...Style.basic,
        fontSize: '20px',
        color: isCompleted ? '#2d5a27' : 'transparent',
      })
      .setOrigin(0, 0.5)
    row.add(checkText, { align: 'center' })

    // Mission name
    const nameText = this.add
      .text(0, 0, this.getMissionDisplayName(mission), {
        ...Style.basic,
        fontSize: '18px',
      })
      .setOrigin(0, 0.5)
      .setWordWrapWidth(rowWidth - 120)
      .setLineSpacing(2)
    row.add(nameText, { proportion: 1, align: 'left-center' })

    if (isUnlocked) {
      const btnContainer = new ContainerLite(
        this,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )
      new Buttons.Basic({
        within: btnContainer,
        text: 'Start',
        f: this.missionOnClick(mission),
        muteClick: true,
      })
      row.add(btnContainer, { align: 'center' })
    } else {
      const lockedContainer = new ContainerLite(
        this,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )
      const lockedText = this.add
        .text(0, 0, 'Locked', {
          ...Style.basic,
          fontSize: '16px',
          color: Color.grey,
        })
        .setOrigin(0.5, 0.5)
      lockedContainer.add(lockedText)
      row.add(lockedContainer, { align: 'center' })
    }

    row.layout()

    return row
  }

  private createHelpButton(): void {
    const x =
      Space.windowWidth -
      Space.buttonWidth / 2 -
      (Space.iconSize * 2 + Space.pad * 3)
    const y = Space.buttonHeight / 2 + Space.pad
    new Buttons.Basic({
      within: this,
      text: 'Help',
      x,
      y,
      f: () => {
        this.scene.launch('MenuScene', {
          menu: 'message',
          title: 'Help',
          s: `Explore the city, learning about each of the travelers who was called here.

          Each character has a neighborhood, where the missions revolve around their unique mechanics and delve into their backstory.
          
          Each mission has a set of cards that you must use for the match, plus whatever cards you choose to include from your inventory.
          
          Completing a mission unlocks new cards and missions. Completing the core missions for a character will often unlock additional neighborhoods.`,
        })
      },
      depth: 10,
    }).setNoScroll()
  }

  private createBackButton(): void {
    new Buttons.Basic({
      within: this,
      text: 'Back',
      x: Space.pad + Space.buttonWidth / 2,
      y: Space.buttonHeight / 2 + Space.pad,
      f: () => {
        this.scene.start('HomeScene')
      },
      depth: 10,
    }).setNoScroll()
  }

  private createRaceButton(): void {
    const x =
      Space.windowWidth -
      Space.buttonWidth / 2 -
      (Space.iconSize + Space.pad * 2) -
      Space.buttonWidth * 2 -
      Space.pad * 2
    const y = Space.buttonHeight / 2 + Space.pad
    new Buttons.Basic({
      within: this,
      text: 'Race',
      x,
      y,
      f: () => {
        this.scene.start('RaceScene', {})
      },
      depth: 10,
    }).setNoScroll()
  }

  // Create a popup for the card specified in params
  private createCardPopup(params): void {
    this.scene.launch('MenuScene', {
      menu: 'message',
      title: 'Card Unlocked!',
      s: params.txt,
      card: params.card,
    })

    // Clear params
    params.txt = ''
    params.card = undefined
  }

  // Create a popup for the tip
  private createTipPopup(params): void {
    this.scene.launch('MenuScene', {
      menu: 'message',
      title: 'Tip',
      s: params.txt,
    })

    // Clear params
    params.txt = ''
    params.card = undefined
  }

  // Create a stillframe animation specified in params
  private createStillframe(params): void {
    // TODO Make dry with the searching tutorial class implementation

    // Height of the tutorial text
    const TEXT_HEIGHT = 225

    let container = this.add.container().setDepth(11)

    let img = this.add
      .image(Space.windowWidth / 2, 0, `journey-Story 4`)
      .setOrigin(0.5, 0)
      .setInteractive()

    // Ensure that image fits perfectly in window
    const scale = Space.windowWidth / img.displayWidth
    img.setScale(scale)

    // Text background
    let background = this.add
      .rectangle(
        0,
        Space.windowHeight - TEXT_HEIGHT,
        Space.windowWidth,
        TEXT_HEIGHT,
        Color.backgroundLight,
      )
      .setOrigin(0)
      .setAlpha(0.8)
    this.plugins.get('rexDropShadowPipeline')['add'](background, {
      distance: 3,
      shadowColor: 0x000000,
    })

    // Add text
    let txt = this.add
      .text(0, 0, '', Style.stillframe)
      .setWordWrapWidth(Space.stillframeTextWidth)

    const s =
      "Impressive, all that life, all that wonder. You are welcomed in of course. But if I might share one thing that I've learned in my time here... It's that someday, everything blows away."

    let textbox = this.rexUI.add
      .textBox({
        text: txt,
        x: Space.pad,
        y: background.y,
        space: {
          left: Space.pad,
          right: Space.pad,
          top: Space.pad,
          bottom: Space.pad,
        },
        page: {
          maxLines: 0, // 0 = unlimited lines
        },
      })
      .start(s, 50)
      .setOrigin(0)

    container.add([img, background, txt, textbox])

    // Add an okay button
    let btn = new Buttons.Basic({
      within: container,
      text: 'Continue',
      x: Space.windowWidth - Space.pad - Space.buttonWidth / 2,
      y: Space.windowHeight - Space.pad - Space.buttonHeight / 2,
      f: () => {
        // If typing isn't complete, complete it
        if (textbox.isTyping) {
          textbox.stop(true)
        }
        // Otherwise move on to the next frame
        else {
          this.tweens.add({
            targets: container,
            alpha: 0,
            duration: Time.stillframeFade,
            onComplete: () => {
              container.setVisible(false)
              container.alpha = 1
            },
          })

          this.scene.start('PlaceholderScene')
        }
      },
    })

    // Scroll the image going down
    this.add.tween({
      targets: img,
      duration: 6000,
      ease: Ease.stillframe,
      y: Space.windowHeight - img.displayHeight,
      onStart: () => {
        img.y = 0
      },
    })

    // Set the param to undefined so it doesn't persist
    params.stillframe = undefined

    const coords = UserSettings._get('journeyCoordinates')
    container.setPosition(coords.x, coords.y)
  }

  private static rememberCoordinates(
    camera: Phaser.Cameras.Scene2D.Camera,
  ): void {
    UserSettings._set('journeyCoordinates', {
      x: camera.scrollX,
      y: camera.scrollY,
    })
  }

  // Return the function for what happens when the given mission node is clicked on (from overlay Start button)
  private missionOnClick(mission: journeyNode): () => void {
    return () => {
      if ('deck' in mission) {
        this.scene.start('MapJourneyBuilderScene', mission)
      } else {
        // Complete the mission
        UserSettings._setIndex('completedMissions', mission.id, true)

        // Show tip
        if ('tip' in mission) {
          this.scene.start('JourneyScene', { txt: mission.tip })
        }
        // Unlock the card
        else if ('card' in mission) {
          UserSettings._setIndex('inventory', mission.card, true)

          const card = Catalog.getCardById(mission.card)
          if (card === undefined) {
            this.scene.start('JourneyScene', {
              txt: 'Error, card undefined',
            })
          } else {
            this.scene.start('JourneyScene', {
              txt: card.story,
              card: card,
            })
          }
        }
      }
    }
  }
}
