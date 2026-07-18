import 'phaser'
import BaseScene from './baseScene'
import {
  Style,
  Space,
  Color,
  UserSettings,
  BBStyle,
} from '../settings/settings'
import Buttons from '../lib/buttons/buttons'

import Catalog from '@shared/state/catalog'
import { getMissionsByTheme, MissionDetails } from '@shared/journey/journey'
import JourneyMapScene, { STARS_THEME_INDEX } from './journeyMapScene'
import Loader from '../loader/loader'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'
import newScrollablePanel from '../lib/scrollablePanel'
import showTooltip from '../utils/tooltips'
import avatarBios from '../data/avatarBios/index'
import avatarNames from '@shared/data/avatarNames'
import avatarStories from '../data/avatarStories/avatarStories'
import JOURNEY_CHOICES, {
  formatJourneyFinaleChapterBody,
} from '../data/journeyChoices'
import Server from '../server'
import Button from '../lib/buttons/button'
import { CardImage } from '../lib/cardImage'

const OVERLAY_WIDTH = 680
const OVERLAY_HEIGHT = 620
const OVERLAY_TOP = 80

const MISSION_TIP_FADE_DURATION = 200
/** Tip box width: from left pad to just left of the overlay panel (one extra pad) */
const MISSION_TIP_BOX_WIDTH = Space.windowWidth - OVERLAY_WIDTH - Space.pad * 3

/** Rex TextBox delay between characters (ms). 0 = full text at once. */
const JOURNEY_TEXTBOX_TYPE_MS = 0

export default class JourneyScene extends BaseScene {
  // The character art
  private overlayCharacterImage: Phaser.GameObjects.Image
  private overlayCharacterStroke: Phaser.GameObjects.Rectangle

  // Button that toggles writing about the character
  private btnCharacterDescription: Button

  private selectedThemeIndex = 0
  private showOverlayCharacterView = false
  private overlayHeaderText: Phaser.GameObjects.Text
  private overlayPanel: ScrollablePanel
  private missionTipContainer: Phaser.GameObjects.Container
  private missionTipBg: Phaser.GameObjects.Rectangle
  private missionTipTextBox: Phaser.GameObjects.GameObject & {
    start: (s: string, speed: number) => void
    stop: (showAll: boolean) => void
  }
  // First reward card of the hovered mission, shown next to the tip
  private missionCardContainer: Phaser.GameObjects.Container
  private missionCardImage: CardImage

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
    } else if (params.theme === 'stars') {
      this.selectedThemeIndex = STARS_THEME_INDEX
    }

    // The panning map runs as its own scene below this one
    this.scene.launch('JourneyMapScene', {
      themeIndex: this.selectedThemeIndex,
    })
    this.events.once('shutdown', () => this.scene.stop('JourneyMapScene'))

    // Add buttons
    this.createBackButton()
    this.createOpeningButton()

    // Mission list overlay on the right
    this.createOverlayCharacterArt()
    this.createJourneyOverlay()
    this.createMissionCardImage()

    // Refresh the overlay when claim/completion state changes. `userDataUpdated`
    // fires when the server pushes a fresh snapshot (e.g. after a mission-gold
    // claim, which is now server-authoritative).
    this.game.events.on('missionGoldClaimed', this.onMissionGoldClaimed, this)
    this.game.events.on('userDataUpdated', this.onMissionGoldClaimed, this)
    this.events.once('shutdown', () => {
      this.game.events.off(
        'missionGoldClaimed',
        this.onMissionGoldClaimed,
        this,
      )
      this.game.events.off('userDataUpdated', this.onMissionGoldClaimed, this)
    })

    showTooltip(this)
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

  private createMissionCardImage(): void {
    // Hidden (alpha 0) until a mission is hovered, mirroring the tip box.
    const tipBoxHeight = Space.pad * 2 + 22 * 6
    const tipBoxTop = Space.windowHeight - tipBoxHeight - Space.pad
    const x = Space.pad + MISSION_TIP_BOX_WIDTH / 2
    const y = tipBoxTop - Space.pad - Space.cardHeight / 2

    this.missionCardContainer = this.add.container(x, y).setAlpha(0)
    this.missionCardImage = new CardImage(
      Catalog.cardback,
      this.missionCardContainer,
      false,
    )
  }

  private showMissionCard(cardId?: number): void {
    const card = cardId !== undefined ? Catalog.getCardById(cardId) : null
    // Missions without a reward card (e.g. tip nodes) show nothing
    if (!card) {
      this.hideMissionCard()
      return
    }
    this.missionCardImage.setCard(card)
    this.tweens.add({
      targets: this.missionCardContainer,
      alpha: 1,
      duration: MISSION_TIP_FADE_DURATION,
      ease: 'Power2.Out',
    })
  }

  private hideMissionCard(): void {
    this.tweens.add({
      targets: this.missionCardContainer,
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

    // moveCamera is false for refreshes where the theme didn't change
    if (moveCamera) {
      const mapScene = this.scene.get('JourneyMapScene') as JourneyMapScene
      mapScene.selectTheme(this.selectedThemeIndex)
    }
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
                  cardName,
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
        f: () => this.scene.start('DeckEditorJourneyScene', { mission }),
      })
      startBtn.setOnHover(
        () => {
          this.showMissionTip(mission.tip ?? '')
          this.showMissionCard(mission.cards?.[0])
        },
        () => {
          this.hideMissionTip()
          this.hideMissionCard()
        },
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
    })
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
    })

    new Buttons.Basic({
      within: this,
      text: 'Tutorial',
      x: (Space.buttonWidth * 5) / 2 + Space.pad * 3,
      y: Space.padSmall + Space.buttonHeight / 2,
      f: () => {
        this.scene.start('TutorialMatchScene', { missionID: 0 })
      },
    })
  }

}
