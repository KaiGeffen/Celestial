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
import Server from '../server'

const OVERLAY_WIDTH = 575
const OVERLAY_HEIGHT = 660
const OVERLAY_TOP = 100

/** Camera center position (x, y) per overlay theme, in theme order: Jules, Adonis, Mia, Kitz, Imani, Mitra, Water, Stars */
const THEME_CAMERA_POSITIONS: { x: number; y: number }[] = [
  { x: 4000, y: 670 }, // birds (Jules)
  { x: 2100, y: 1270 }, // ashes (Adonis)
  { x: 4860, y: 1940 }, // shadow (Mia)
  { x: 1260, y: 2250 }, // pet (Kitz)
  { x: 1590, y: 4140 }, // birth (Imani)
  { x: 4850, y: 4130 }, // vision (Mitra)
  { x: 3180, y: 3100 }, // water
  { x: 3080, y: 2800 }, // stars
]

const DRIFT_RADIUS_X = 150
const DRIFT_RADIUS_Y = 80
const DRIFT_SPEED = 0.0003
const DRIFT_PHASE = 1.3
const THEME_CAMERA_TWEEN_DURATION = 400

const TODO_ICON_SIZE = 32

const STARS_THEME_INDEX = THEME_KEYS.indexOf('stars')
const ALT_MAP_FADE_DURATION = 400
const MISSION_TIP_FADE_DURATION = 200
/** Tip box width: from left pad to just left of the overlay panel (one extra pad) */
const MISSION_TIP_BOX_WIDTH = Space.windowWidth - OVERLAY_WIDTH - Space.pad * 3
const DEFAULT_MISSION_TIP =
  'This mission will challenge your deck-building and strategy.\n\nComplete the required cards, then choose the rest to fill your deck.\n\nGood luck.'
const ALT_MAP_SWAY_SPEED = 0.0004
const ALT_MAP_SWAY_PHASE = 1.5
const ALT_MAP_SWAY_RADIUS = 80

export default class JourneyScene extends BaseScene {
  map: Phaser.GameObjects.Image
  private altMap: Phaser.GameObjects.Image

  // The character art
  private overlayCharacterImage: Phaser.GameObjects.Image

  /** Center point the camera drifts around (theme position) */
  private driftCenterX = 0
  private driftCenterY = 0

  private isTweeningCamera = false
  private selectedThemeIndex = 0
  private previousThemeIndex = 0
  private showOverlayCharacterView = false
  private overlayHeaderText: Phaser.GameObjects.Text
  private overlayPanel: ScrollablePanel
  private overlayArtButtonContainer: ContainerLite
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

    const camera = this.cameras.main
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

    const overlayBackground = this.add
      .rectangle(0, 0, OVERLAY_WIDTH, OVERLAY_HEIGHT, Color.backgroundLight)
      .setOrigin(0)

    this.overlayPanel = newScrollablePanel(this, {
      x: Space.windowWidth - OVERLAY_WIDTH - Space.pad,
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

    this.createMissionTipBox()

    this.refreshOverlayContent(false) // already at theme position; no tween on open
  }

  private createOverlayCharacterArt(): void {
    const topPad = Space.buttonHeight + Space.pad * 2
    const availableHeight = Space.windowHeight - topPad * 2

    this.overlayCharacterImage = this.add
      .image(Space.pad, topPad, 'avatar-JulesFull')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setVisible(false)
      .setDepth(100)
      .setScale(
        availableHeight /
          this.textures.get('avatar-JulesFull').getSourceImage().height,
      )
    this.addShadow(this.overlayCharacterImage)
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

  private getMissionTip(mission: MissionDetails): string {
    return mission.tip ?? DEFAULT_MISSION_TIP
  }

  private showMissionTip(text: string): void {
    this.missionTipTextBox.start(text, 5)
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
        fontSize: '30px',
        color: '#f5f2eb',
      })
      .setOrigin(0.5, 0.5)

    const leftArrow = this.add
      .text(0, 0, '‹', {
        ...Style.announcement,
        fontSize: '30px',
        color: '#f5f2eb',
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })
    leftArrow.on('pointerdown', () => {
      this.sound.play('click')
      this.showOverlayCharacterView = false
      this.selectedThemeIndex =
        (this.selectedThemeIndex - 1 + themes.length) % themes.length
      this.refreshOverlayContent()
    })
    const rightArrow = this.add
      .text(0, 0, '›', {
        ...Style.announcement,
        fontSize: '30px',
        color: '#f5f2eb',
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })
    rightArrow.on('pointerdown', () => {
      this.sound.play('click')
      this.showOverlayCharacterView = false
      this.selectedThemeIndex = (this.selectedThemeIndex + 1) % themes.length
      this.refreshOverlayContent()
    })

    this.overlayArtButtonContainer = new ContainerLite(
      this,
      0,
      0,
      TODO_ICON_SIZE,
      TODO_ICON_SIZE,
    )
    const overlayArtButton = new Buttons.Icon({
      within: this.overlayArtButtonContainer,
      name: 'Quest',
      f: () => {
        if (this.selectedThemeIndex < avatarNames.length) {
          this.showOverlayCharacterView = !this.showOverlayCharacterView
          this.refreshOverlayContent(false)
        }
      },
    })
    overlayArtButton.icon.setTintFill(Color.backgroundLight)

    const sideControlsWidth = leftArrow.width + Space.pad + TODO_ICON_SIZE
    const leftControls = this.rexUI.add.sizer({
      orientation: 'horizontal',
      width: sideControlsWidth,
      space: { item: Space.pad },
    })
    leftControls
      .add(leftArrow, { align: 'center' })
      .add(this.overlayArtButtonContainer, {
        align: 'center',
      })

    const rightControls = this.rexUI.add.sizer({
      orientation: 'horizontal',
      width: sideControlsWidth,
    })
    rightControls.addSpace().add(rightArrow, { align: 'center' })

    headerSizer
      .add(leftControls, { align: 'center' })
      .addSpace()
      .add(this.overlayHeaderText, { proportion: 1, align: 'center' })
      .addSpace()
      .add(rightControls, { align: 'center' })
    headerSizer.layout()
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
    const padding = Space.padSmall
    const text = this.add
      .text(0, 0, '', Style.basic)
      .setWordWrapWidth(OVERLAY_WIDTH - padding * 2)
      .setOrigin(0)

    const textBox = this.rexUI.add
      .textBox({
        text,
        x: 0,
        y: 0,
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

    const bioText =
      '    ' +
      (avatarBios[this.selectedThemeIndex] ?? 'Bio coming soon.')
        .replace(/\n/g, '\n\n    ')
        .trim()
    textBox.start(bioText, 5)

    return this.rexUI.add
      .sizer({
        orientation: 'vertical',
        space: {
          left: padding,
          right: padding,
          top: padding,
          bottom: padding,
        },
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
    this.overlayArtButtonContainer.setVisible(hasCharacterArt)

    if (!hasCharacterArt) {
      this.overlayCharacterImage.setVisible(false)
      return
    }

    const avatarName = avatarNames[this.selectedThemeIndex]
    this.overlayCharacterImage.setTexture(`avatar-${avatarName}Full`)
    this.overlayCharacterImage.setVisible(this.showOverlayCharacterView)
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
      space: { left: 4, right: 4, top: 4, bottom: 4, item: 8 },
    })

    const rowBg = this.add.rectangle(0, 0, 1, 1, 0xf5f2eb).setOrigin(0)
    row.addBackground(rowBg)

    const isCompleted = completed[mission.id]
    const isUnlocked = this.isMissionUnlocked(mission, completed)
    const difficulty = Phaser.Math.Clamp(mission.difficulty ?? 3, 1, 5)

    // 0) Leftmost: quest icon when completed (opens character story)
    const iconCell = new ContainerLite(
      this,
      0,
      0,
      TODO_ICON_SIZE,
      TODO_ICON_SIZE,
    )
    if (isCompleted) {
      const hasClaimedMissionGold =
        Server.getUserData().missionGoldClaimed?.[mission.id] ?? false
      new Buttons.Icon({
        within: iconCell,
        name: 'Quest',
        muteClick: true,
        f: () => {
          if (mission.id < 700) {
            const avatarIndex = Math.floor(mission.id / 100) - 1
            const chapterIndex = mission.id % 100
            const storyText =
              '      ' +
              (avatarStories[avatarIndex]?.[chapterIndex] ?? 'Coming soon')
                .replace(/\n/g, '\n\n      ')
                .trim()
            this.scene.launch('MenuScene', {
              menu: 'chapterMessage',
              title: `${avatarNames[avatarIndex]} — ${mission.name}`,
              s: storyText,
              claimGoldMissionId: mission.id,
            })
          } else {
            this.scene.launch('MenuScene', {
              menu: 'chapterMessage',
              title: mission.name,
              s: 'Writing coming soon.',
              claimGoldMissionId: mission.id,
            })
          }
        },
      })
      if (!hasClaimedMissionGold) {
        const badge = this.add.circle(
          TODO_ICON_SIZE / 2 - 5,
          -TODO_ICON_SIZE / 2 + 5,
          5,
          0xd64045,
        )
        iconCell.add(badge)
      }
    }
    row.add(iconCell, { align: 'center' })

    // 1) Mission name + card emojis
    let nameBBCode = this.getMissionDisplayName(mission)
    if ('deck' in mission && mission.cards?.length) {
      for (const cardId of mission.cards) {
        if (Catalog.getCardById(cardId)) {
          nameBBCode += ` [area=card_${cardId}]🎴[/area]`
        }
      }
    }
    const nameText = this.rexUI.add
      .BBCodeText(0, 0, nameBBCode, {
        ...BBStyle.basic,
        fontSize: '18px',
      })
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
        muteClick: true,
      })
      startBtn.setOnHover(
        () => this.showMissionTip(this.getMissionTip(mission)),
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
      (TODO_ICON_SIZE + Space.pad * 2) -
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
  private missionOnClick(mission: MissionDetails): () => void {
    return () => {
      if ('deck' in mission) {
        this.scene.start('MapJourneyBuilderScene', mission)
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
