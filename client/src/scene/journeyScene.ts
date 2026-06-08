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
  BBStyle,
} from '../settings/settings'
import Buttons from '../lib/buttons/buttons'

import Catalog from '../../../shared/state/catalog'
import {
  getMissionsByTheme,
  MissionDetails,
  THEME_KEYS,
} from '../../../shared/journey/journey'
import Loader from '../loader/loader'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'
import newScrollablePanel from '../lib/scrollablePanel'
import showTooltip from '../utils/tooltips'
import avatarBios from '../data/avatarBios/index'
import avatarNames from '../../../shared/data/avatarNames'
import avatarStories from '../data/avatarStories/avatarStories'
import JOURNEY_CHOICES, {
  formatJourneyFinaleChapterBody,
} from '../data/journeyChoices'
import Server from '../server'
import Button from '../lib/buttons/button'

const OVERLAY_WIDTH = 680
const OVERLAY_HEIGHT = 620
const OVERLAY_TOP = 80

// TODO Remove 'message' menus, they are no longer used

/** Camera center position (x, y) per overlay theme, in theme order: Jules, Adonis, Mia, Kitz, Renata, Mitra, Water, Stars */
const THEME_CAMERA_POSITIONS: { x: number; y: number }[] = [
  { x: 4000, y: 670 }, // birds (Jules)
  { x: 2100, y: 1270 }, // ashes (Adonis)
  { x: 4860, y: 1940 }, // shadow (Mia)
  { x: 1260, y: 2250 }, // pet (Kitz)
  { x: 1590, y: 4140 }, // birth (Renata)
  { x: 4850, y: 4130 }, // vision (Mitra)
  { x: 3180, y: 3100 }, // water
  { x: 3080, y: 2800 }, // stars
]

const DRIFT_RADIUS_X = 150
const DRIFT_RADIUS_Y = 80
const DRIFT_SPEED = 0.0003
const DRIFT_PHASE = 1.3
const THEME_CAMERA_TWEEN_DURATION = 400

const STARS_THEME_INDEX = THEME_KEYS.indexOf('stars')
const ALT_MAP_FADE_DURATION = 400
const MISSION_TIP_FADE_DURATION = 200
/** Tip box width: from left pad to just left of the overlay panel (one extra pad) */
const MISSION_TIP_BOX_WIDTH = Space.windowWidth - OVERLAY_WIDTH - Space.pad * 3
const ALT_MAP_SWAY_SPEED = 0.0004
const ALT_MAP_SWAY_PHASE = 1.5
const ALT_MAP_SWAY_RADIUS = 80

/** Rex TextBox delay between characters (ms). 0 = full text at once. */
const JOURNEY_TEXTBOX_TYPE_MS = 0

export default class JourneyScene extends BaseScene {
  map: Phaser.GameObjects.Image
  private altMap: Phaser.GameObjects.Image

  // The character art
  private overlayCharacterImage: Phaser.GameObjects.Image
  private overlayCharacterStroke: Phaser.GameObjects.Rectangle

  /** Center point the camera drifts around (theme position) */
  private driftCenterX = 0
  private driftCenterY = 0

  // Button that toggles writing about the character
  private btnCharacterDescription: Button

  private isTweeningCamera = false
  private selectedThemeIndex = 0
  private previousThemeIndex = 0
  private showOverlayCharacterView = false
  private overlayHeaderText: Phaser.GameObjects.Text
  private overlayPanel: ScrollablePanel
  private missionTipContainer: Phaser.GameObjects.Container
  private missionTipBg: Phaser.GameObjects.Rectangle
  private missionTipTextBox: Phaser.GameObjects.GameObject & {
    start: (s: string, speed: number) => void
    stop: (showAll: boolean) => void
  }

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

    // Allow starting on a specific theme (e.g. stars after a mission)
    if (params.themeIndex !== undefined) {
      this.selectedThemeIndex = params.themeIndex
      this.previousThemeIndex = params.themeIndex
    } else if (params.theme === 'stars') {
      this.selectedThemeIndex = STARS_THEME_INDEX
      this.previousThemeIndex = STARS_THEME_INDEX
    }

    // Create the background
    this.map = this.add.image(0, 0, 'journey-Map').setOrigin(0)

    this.altMap = this.add
      .image(0, 0, 'journey-AltMap')
      .setOrigin(0.5, 0.5)
      .setAlpha(0)
      .setScrollFactor(0)
    this.plugins.get('rexAnchor')['add'](this.altMap, {
      x: '50%',
      y: '50%',
      width: '120%',
      height: '120%',
    })

    this.cameras.main.setBounds(0, 0, this.map.width, this.map.height)

    // Add buttons
    this.createBackButton()
    this.createOpeningButton()

    // Make up pop-up for the card you just received, if there is one
    if (params.card) {
      this.createCardPopup(params)
    } else if (params.txt) {
      this.createTipPopup(params)
    }

    // Start at selected theme position immediately (no transition on open)
    this.snapCameraToTheme(this.selectedThemeIndex)

    // Mission list overlay on the right
    this.createOverlayCharacterArt()
    this.createJourneyOverlay()

    // If we started on stars, show alt map immediately (no fade-in delay)
    if (this.selectedThemeIndex === STARS_THEME_INDEX) {
      this.altMap.alpha = 1
    }

    this.game.events.on('missionGoldClaimed', this.onMissionGoldClaimed, this)
    this.events.once('shutdown', () => {
      this.game.events.off(
        'missionGoldClaimed',
        this.onMissionGoldClaimed,
        this,
      )
    })

    showTooltip(this)
  }

  update(time: number, _delta: number): void {
    if (this.isTweeningCamera) return
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

    // Gentle sway on alt map when visible (stars theme)
    if (this.altMap.alpha > 0) {
      this.altMap.x =
        camera.width / 2 +
        Math.sin(time * ALT_MAP_SWAY_SPEED) * ALT_MAP_SWAY_RADIUS
      this.altMap.y =
        camera.height / 2 +
        Math.sin(time * ALT_MAP_SWAY_SPEED * 0.7 + ALT_MAP_SWAY_PHASE) *
          ALT_MAP_SWAY_RADIUS
    }
  }

  private createJourneyOverlay(): void {
    const themes = getMissionsByTheme()

    const contentSizer = this.rexUI.add.fixWidthSizer({
      width: OVERLAY_WIDTH,
      space: { item: 6 },
    })

    const overlayBackground = this.add.image(0, 0, 'background-Light')

    this.overlayPanel = newScrollablePanel(this, {
      x: Space.windowWidth - OVERLAY_WIDTH - 20,
      y: OVERLAY_TOP,
      width: OVERLAY_WIDTH,
      height: OVERLAY_HEIGHT,
      scrollMode: 0,
      background: overlayBackground,
      header: this.createOverlayHeader(themes),
      panel: { child: contentSizer },
      space: { header: 0 },
    })
    this.overlayPanel.setScrollFactor(0)

    const strokeBg = this.add
      .rectangle(0, 0, 1, 1)
      .setStrokeStyle(3, Color.backgroundStroke)
    this.overlayPanel.addBackground(strokeBg)

    this.createMissionTipBox()

    this.refreshOverlayContent(false) // already at theme position; no tween on open
  }

  private createOverlayCharacterArt(): void {
    const x = Space.windowWidth - OVERLAY_WIDTH - Space.pad
    this.overlayCharacterImage = this.add
      .image(x, OVERLAY_TOP, 'avatar-JulesFull')
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setVisible(false)
      .setScale(
        OVERLAY_HEIGHT /
          this.textures.get('avatar-JulesFull').getSourceImage().height,
      )

    this.overlayCharacterStroke = this.add
      .rectangle(
        x,
        OVERLAY_TOP,
        this.overlayCharacterImage.displayWidth,
        OVERLAY_HEIGHT,
        0x000000,
        0,
      )
      .setOrigin(1, 0)
      .setStrokeStyle(3, Color.backgroundStroke)
      .setScrollFactor(0)
  }

  private createMissionTipBox(): void {
    const padding = Space.pad
    const lineHeight = 22
    const maxLines = 6
    const boxHeight = padding * 2 + lineHeight * maxLines
    const boxWidth = MISSION_TIP_BOX_WIDTH
    const x = Space.pad
    const y = Space.windowHeight - boxHeight - Space.pad

    this.missionTipContainer = this.add.container(x, y)

    this.missionTipBg = this.add
      .rectangle(0, 0, boxWidth, boxHeight, 0x353f4e, 0.92)
      .setOrigin(0)
      .setStrokeStyle(2, Color.black)

    const tipStyle = {
      ...Style.basic,
      color: Color.whiteS,
    }
    const txt = this.add
      .text(0, 0, '', tipStyle)
      .setWordWrapWidth(boxWidth - padding * 2)
      .setOrigin(0)

    this.missionTipTextBox = this.rexUI.add
      .textBox({
        text: txt,
        x: padding,
        y: padding,
        space: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
        page: {
          maxLines: 0,
        },
      })
      .setOrigin(0)

    this.missionTipContainer.add([
      this.missionTipBg,
      txt,
      this.missionTipTextBox,
    ])
    this.missionTipContainer.setScrollFactor(0)
    this.missionTipContainer.setAlpha(0)
  }

  private showMissionTip(text: string): void {
    this.missionTipTextBox.start(text, JOURNEY_TEXTBOX_TYPE_MS)
    this.tweens.add({
      targets: this.missionTipContainer,
      alpha: 1,
      duration: MISSION_TIP_FADE_DURATION,
      ease: 'Power2.Out',
    })
  }

  private hideMissionTip(): void {
    this.tweens.add({
      targets: this.missionTipContainer,
      alpha: 0,
      duration: MISSION_TIP_FADE_DURATION,
      ease: 'Power2.In',
    })
  }

  private createOverlayHeader(
    themes: ReturnType<typeof getMissionsByTheme>,
  ): Phaser.GameObjects.GameObject {
    // Background
    const headerBg = this.add
      .image(0, 0, 'chrome-journeyHeader')
      .setInteractive()
    const headerSizer = this.rexUI.add
      .sizer({
        orientation: 'horizontal',
        width: OVERLAY_WIDTH,
        space: {
          left: Space.padSmall,
          right: Space.padSmall,
          top: Space.padSmall,
          bottom: Space.padSmall,
        },
      })
      .addBackground(headerBg)

    // Header title text
    this.overlayHeaderText = this.add
      .text(0, 0, '', Style.journeyOverlay)
      .setOrigin(0.5, 0.5)

    // Arrows
    const leftArrowContainer = new ContainerLite(this, 0, 0, 50, 50)
    new Buttons.Icon({
      within: leftArrowContainer,
      name: 'Left',
      f: () => {
        this.showOverlayCharacterView = false
        this.selectedThemeIndex =
          (this.selectedThemeIndex - 1 + themes.length) % themes.length
        this.refreshOverlayContent()
      },
    })
    const rightArrowContainer = new ContainerLite(this, 0, 0, 50, 50)
    new Buttons.Icon({
      within: rightArrowContainer,
      name: 'Right',
      f: () => {
        this.showOverlayCharacterView = false
        this.selectedThemeIndex = (this.selectedThemeIndex + 1) % themes.length
        this.refreshOverlayContent()
      },
    })

    // Character writing icon
    const btnContainer = new ContainerLite(
      this,
      0,
      0,
      Space.iconSize,
      Space.iconSize,
    )
    this.btnCharacterDescription = new Buttons.Icon({
      within: btnContainer,
      name: 'scroll',
      f: () => {
        if (this.selectedThemeIndex < avatarNames.length) {
          this.showOverlayCharacterView = !this.showOverlayCharacterView
          this.refreshOverlayContent(false)
        }
      },
    })

    // Add everything to the sizer
    headerSizer
      .add(leftArrowContainer)
      .add(btnContainer)
      .add(this.overlayHeaderText, { proportion: 1 })
      .add(rightArrowContainer)
    return headerSizer
  }

  private refreshOverlayContent(moveCamera = true): void {
    const themes = getMissionsByTheme()
    const theme = themes[this.selectedThemeIndex]
    const completed: boolean[] = UserSettings._get('completedMissions')
    this.overlayHeaderText.setText(`${theme.displayName}`)
    const panel = this.overlayPanel.getElement('panel') as FixWidthSizer
    panel.removeAll(true)
    if (
      this.showOverlayCharacterView &&
      this.selectedThemeIndex < avatarNames.length
    ) {
      panel.add(this.createOverlayCharacterText())
    } else {
      theme.missions.forEach((mission) => {
        const row = this.createMissionOverlayRow(mission, completed)
        panel.add(row)
      })
    }
    this.refreshOverlayCharacterArt()
    this.overlayPanel.layout()
    if (moveCamera && this.selectedThemeIndex !== STARS_THEME_INDEX) {
      const leavingStars = this.previousThemeIndex === STARS_THEME_INDEX
      if (leavingStars) {
        this.snapCameraToTheme(this.selectedThemeIndex)
      } else {
        this.moveCameraToTheme(this.selectedThemeIndex)
      }
    }
    this.previousThemeIndex = this.selectedThemeIndex
    this.updateAltMapFade()
  }

  private createOverlayCharacterText(): Phaser.GameObjects.GameObject {
    const padding = Space.pad * 2
    const text = this.add
      .text(0, 0, '', Style.chapterBody)
      .setWordWrapWidth(OVERLAY_WIDTH - padding * 2)
      .setOrigin(0)

    const textBox = this.rexUI.add
      .textBox({
        text,
        x: 0,
        y: 0,
        space: {
          left: padding,
          right: padding,
          top: padding,
          bottom: padding,
        },
        page: {
          maxLines: 0,
        },
      })
      .setOrigin(0)

    const bioText =
      '    ' +
      (avatarBios[this.selectedThemeIndex] ?? 'Bio coming soon.')
        .replace(/\n/g, '\n\n    ')
        .trim()
    textBox.start(bioText, JOURNEY_TEXTBOX_TYPE_MS)

    return this.rexUI.add
      .sizer({
        orientation: 'vertical',
      })
      .add(textBox)
  }

  private updateAltMapFade(): void {
    const showAltMap = this.selectedThemeIndex === STARS_THEME_INDEX
    const targetAlpha = showAltMap ? 1 : 0
    if (this.altMap.alpha === targetAlpha) return
    this.tweens.add({
      targets: this.altMap,
      alpha: targetAlpha,
      duration: ALT_MAP_FADE_DURATION,
      ease: 'Power2.InOut',
    })
  }

  private refreshOverlayCharacterArt(): void {
    const hasCharacterArt = this.selectedThemeIndex < avatarNames.length

    // Button is enabled/not based on if character has art
    const invert = !hasCharacterArt
    this.btnCharacterDescription.enable(invert)

    if (!hasCharacterArt) {
      this.overlayCharacterImage.setVisible(false)
      this.overlayCharacterStroke.setVisible(false)
      return
    }

    const avatarName = avatarNames[this.selectedThemeIndex]
    this.overlayCharacterImage.setTexture(`avatar-${avatarName}Full`)
    this.overlayCharacterImage.setVisible(this.showOverlayCharacterView)
    this.overlayCharacterStroke.setVisible(this.showOverlayCharacterView)
  }

  private onMissionGoldClaimed(): void {
    this.refreshOverlayContent(false)
  }

  /** Set camera and drift center to theme position without tweening */
  private snapCameraToTheme(themeIndex: number): void {
    const pos = THEME_CAMERA_POSITIONS[themeIndex]
    if (!pos) return
    this.driftCenterX = pos.x
    this.driftCenterY = pos.y
    const camera = this.cameras.main
    const maxScrollX = Math.max(0, this.map.width - camera.width)
    const maxScrollY = Math.max(0, this.map.height - camera.height)
    camera.scrollX = Phaser.Math.Clamp(pos.x - camera.width / 2, 0, maxScrollX)
    camera.scrollY = Phaser.Math.Clamp(pos.y - camera.height / 2, 0, maxScrollY)
    JourneyScene.rememberCoordinates(camera)
  }

  private moveCameraToTheme(themeIndex: number): void {
    const pos = THEME_CAMERA_POSITIONS[themeIndex]
    if (!pos) return
    this.driftCenterX = pos.x
    this.driftCenterY = pos.y
    const camera = this.cameras.main
    const maxScrollX = Math.max(0, this.map.width - camera.width)
    const maxScrollY = Math.max(0, this.map.height - camera.height)
    const targetScrollX = Phaser.Math.Clamp(
      pos.x - camera.width / 2,
      0,
      maxScrollX,
    )
    const targetScrollY = Phaser.Math.Clamp(
      pos.y - camera.height / 2,
      0,
      maxScrollY,
    )
    this.tweens.killTweensOf(camera)
    this.isTweeningCamera = true
    this.tweens.add({
      targets: camera,
      scrollX: targetScrollX,
      scrollY: targetScrollY,
      duration: THEME_CAMERA_TWEEN_DURATION,
      ease: 'Power2.Out',
      onComplete: () => {
        this.isTweeningCamera = false
        JourneyScene.rememberCoordinates(camera)
      },
    })
  }

  private isMissionUnlocked(
    mission: MissionDetails,
    completed: boolean[],
  ): boolean {
    return mission.prereq.some((prereqs) =>
      prereqs.every((id) => completed[id]),
    )
  }

  private getMissionDisplayName(mission: MissionDetails): string {
    return mission.name
  }

  private createMissionOverlayRow(
    mission: MissionDetails,
    completed: boolean[],
  ): Phaser.GameObjects.GameObject {
    const rowWidth = OVERLAY_WIDTH
    const row = this.rexUI.add.sizer({
      orientation: 'horizontal',
      width: rowWidth,
      space: {
        left: Space.padSmall,
        right: Space.padSmall,
        top: Space.padSmall / 2,
        bottom: Space.padSmall / 2,
        item: Space.padSmall,
      },
    })

    const isCompleted = completed[mission.id]
    const isUnlocked = this.isMissionUnlocked(mission, completed)
    const difficulty = Phaser.Math.Clamp(mission.difficulty ?? 3, 1, 5)

    // 0) Leftmost: quest icon when completed (opens character story)
    const iconCell = new ContainerLite(
      this,
      0,
      0,
      Space.iconSize,
      Space.iconSize,
    )
    if (isCompleted) {
      const hasClaimedMissionGold =
        Server.getUserData().missionGoldClaimed?.[mission.id] ?? false
      const btn = new Buttons.Icon({
        within: iconCell,
        name: 'scrollDark',
        muteClick: true,
        f: () => {
          const cardName = Catalog.getCardById(mission.cards?.[0])?.name

          if (mission.id < 700) {
            const avatarIndex = Math.floor(mission.id / 100) - 1
            const chapterIndex = mission.id % 100
            const isChapter9 =
              chapterIndex === 8 && avatarIndex < JOURNEY_CHOICES.length

            // For the finale, show the choice, or the result if a choice has already been made
            if (isChapter9) {
              const choices = UserSettings._get('journeyChoices') as (
                | number
                | null
              )[]
              const existingChoice = choices[avatarIndex]
              if (existingChoice != null) {
                const resultText = formatJourneyFinaleChapterBody(
                  avatarIndex,
                  existingChoice as 0 | 1,
                )
                this.scene.launch('MenuScene', {
                  menu: 'chapterMessage',
                  title: mission.name,
                  s: resultText,
                  cardName,
                  claimGoldMissionId: mission.id,
                })
              } else {
                this.scene.launch('MenuScene', {
                  menu: 'choiceChapterMessage',
                  title: mission.name,
                  avatarIndex,
                  claimGoldMissionId: mission.id,
                })
              }
            } else {
              const storyText =
                '      ' +
                (avatarStories[avatarIndex]?.[chapterIndex] ?? 'Coming soon')
                  .replace(/\n/g, '\n      ')
                  .trim()
              this.scene.launch('MenuScene', {
                menu: 'chapterMessage',
                title: mission.name,
                s: storyText,
                cardName,
                claimGoldMissionId: mission.id,
              })
            }
          } else {
            this.scene.launch('MenuScene', {
              menu: 'chapterMessage',
              title: mission.name,
              s: 'Writing coming soon.',
              cardName,
              claimGoldMissionId: mission.id,
            })
          }
        },
      })

      // Add a notification badge if the mission has not been claimed
      if (!hasClaimedMissionGold) {
        const badge = this.add
          .circle(Space.iconSize / 2 - 5, -Space.iconSize / 2 + 5, 5, 0xd64045)
          .setStrokeStyle(1, Color.brown)
        iconCell.add(badge)
      }
    }
    row.add(iconCell, { align: 'center' })

    // 1) Mission name + card emojis
    let nameBBCode = this.getMissionDisplayName(mission)
    // if ('deck' in mission && mission.cards?.length) {
    //   for (const cardId of mission.cards) {
    //     if (Catalog.getCardById(cardId)) {
    //       nameBBCode += ` [area=card_${cardId}][img=card][/area]`
    //     }
    //   }
    // }
    const nameText = this.rexUI.add
      .BBCodeText(0, 0, nameBBCode, BBStyle.missionName)
      .setInteractive()
      .on('areaover', (key: string) => {
        if (key.startsWith('card_')) {
          const cardId = parseInt(key.replace('card_', ''), 10)
          const card = Catalog.getCardById(cardId)
          if (card) this.hint.showCard(card)
        }
      })
      .on('areaout', () => this.hint.hide())
    row.add(nameText, { align: 'left-center' })
    row.addSpace() // right-justify stars and button

    // 2) Stars (difficulty)
    const starSize = 23
    const starGap = 2
    const width = 120
    const starsAndStampSizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: starGap },
    })
    starsAndStampSizer.addSpace()
    const overlayCell = this.add.container(1, 0)
    overlayCell.width = width
    for (let i = 0; i < difficulty; i++) {
      const star = this.add.image(
        (5 - i) * (starSize + starGap) - width / 2 - 20,
        0,
        'icon-JourneyStar',
      )
      if (!isCompleted) {
        star.setTint(0x000080)
      }
      overlayCell.add(star)
    }
    starsAndStampSizer.add(overlayCell, { align: 'center' })
    starsAndStampSizer.addSpace()
    row.add(starsAndStampSizer)

    // 3) Start or Locked button
    if (isUnlocked) {
      const btnContainer = new ContainerLite(
        this,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )
      const startBtn = new Buttons.Basic({
        within: btnContainer,
        text: 'Start',
        f: this.missionOnClick(mission),
      })
      startBtn.setOnHover(
        () => this.showMissionTip(mission.tip ?? ''),
        () => this.hideMissionTip(),
      )
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
        .text(0, 0, 'Locked', Style.journeyLocked)
        .setOrigin(0.5, 0.5)
      lockedContainer.add(lockedText)
      row.add(lockedContainer, { align: 'center' })
    }

    row.layout()

    return row
  }

  private createBackButton(): void {
    new Buttons.Basic({
      within: this,
      text: 'Back',
      x: Space.pad + Space.buttonWidth / 2,
      y: Space.padSmall + Space.buttonHeight / 2,
      f: () => {
        this.scene.start('HomeScene')
      },
      depth: 10,
    }).setNoScroll()
  }

  private createOpeningButton(): void {
    new Buttons.Basic({
      within: this,
      text: 'Intro',
      x: (Space.buttonWidth * 3) / 2 + Space.pad * 2,
      y: Space.padSmall + Space.buttonHeight / 2,
      f: () => {
        this.scene.start('OpeningScene')
      },
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

  private static rememberCoordinates(
    camera: Phaser.Cameras.Scene2D.Camera,
  ): void {
    UserSettings._set('journeyCoordinates', {
      x: camera.scrollX,
      y: camera.scrollY,
    })
  }

  // Return the function for what happens when the given mission node is clicked on (from overlay Start button)
  private missionOnClick(mission: MissionDetails): () => void {
    return () => {
      if ('deck' in mission) {
        this.scene.start('DeckEditorJourneyScene', { mission })
      } else if ('tip' in mission) {
        // Tip node: mark complete and show tip popup
        UserSettings._setIndex('completedMissions', mission.id, true)
        const onMenuClosed = () => {
          this.refreshOverlayContent(false)
        }
        this.scene.launch('MenuScene', {
          menu: 'message',
          title: 'Tip',
          s: mission.tip,
        })
        this.scene.get('MenuScene').events.once('shutdown', onMenuClosed)
      }
    }
  }
}
