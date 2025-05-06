import 'phaser'
import { Style, Space, Color } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import UserDataServer from '../../network/userDataServer'
import { achievementsMeta } from '../../../../shared/achievementsData'

const width = 900
const height = 600

export default class AchievementsMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene, width, params)

    // Base sizer has no pad between lines
    this.sizer.space.line = 0

    this.createHeader('Achievements')
    this.createContent()
    this.layout()
  }

  private createContent() {
    // Map of user's achievements by id
    const userAchievements = (
      UserDataServer.getUserData()?.achievements || []
    ).reduce(
      (acc, ach) => {
        acc[ach.achievement_id] = ach
        return acc
      },
      {} as Record<
        number,
        { achievement_id: number; progress: number; seen: boolean }
      >,
    )

    // Sort achievements into three groups
    const unseenUnlocked: number[] = []
    const locked: number[] = []
    const seenUnlocked: number[] = []

    Object.keys(achievementsMeta).forEach((idStr) => {
      const id = Number(idStr)
      const userAch = userAchievements[id]
      if (!userAch) {
        locked.push(id)
      } else {
        // Progress achievement not yet completed
        const meta = achievementsMeta[id]
        if (
          typeof meta.progress === 'number' &&
          userAch.progress < meta.progress
        ) {
          locked.push(id)
        }
        // Unlocked, maybe not yet seen
        else {
          if (!userAch.seen) {
            unseenUnlocked.push(id)
          } else {
            seenUnlocked.push(id)
          }
        }
      }
    })

    // Header row
    const headerSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      width: width,
      space: {
        left: Space.padSmall,
        right: Space.padSmall,
      },
    })
    headerSizer
      .add(this.scene.add.text(0, 0, 'Title', Style.basic), { proportion: 2 })
      .add(this.scene.add.text(0, 0, 'Description', Style.basic), {
        proportion: 5,
      })
      .add(this.scene.add.text(0, 0, 'Reward', Style.basic), { proportion: 1 })

    // Add line beneath header
    const line = this.scene.add.line(0, 0, 0, 0, width, 0, Color.line)

    // Rows
    const rowsSizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      height: height,
      space: {
        item: Space.padSmall,
        top: Space.padSmall,
        bottom: Space.padSmall,
      },
    })

    // Helper to add a row
    const addRow = (id: number, meta, backgroundColor?: number) => {
      const userAch = userAchievements[id]
      const userProgress = userAch ? userAch.progress : 0
      let description = meta.description
      if (typeof meta.progress === 'number' && userProgress < meta.progress) {
        description += ` (${userProgress}/${meta.progress})`
      }

      // Create row with background and spacing
      const singleRowSizer = this.scene.rexUI.add.sizer({
        orientation: 'horizontal',
        width: width,
        space: {
          left: Space.padSmall,
          right: Space.padSmall,
          top: Space.padSmall,
          bottom: Space.padSmall,
          item: 10,
        },
      })

      // Add background to the row
      if (backgroundColor) {
        singleRowSizer.addBackground(
          this.scene.add.rectangle(0, 0, 1, 1, backgroundColor),
        )
      }

      // Add row content
      singleRowSizer
        .add(this.scene.add.text(0, 0, meta.title, Style.basic), {
          proportion: 2,
        })
        .add(
          this.scene.add
            .text(0, 0, description, Style.basic)
            .setWordWrapWidth(width * 0.6)
            .setFixedSize(width * 0.6, 0),
          {
            proportion: 5,
          },
        )
        .add(this.scene.add.image(0, 0, meta.image))

      rowsSizer.add(singleRowSizer)
    }

    // Add in the requested order:
    // 1. Unseen unlocked (at top)
    // 2. Locked (in middle)
    // 3. Seen unlocked (at bottom)
    unseenUnlocked.forEach((id) => addRow(id, achievementsMeta[id], Color.gold))
    locked.forEach((id) =>
      addRow(id, achievementsMeta[id], Color.backgroundLight),
    )
    seenUnlocked.forEach((id) => addRow(id, achievementsMeta[id]))

    // Scrollable panel
    const scrollablePanel = this.scene.rexUI.add.scrollablePanel({
      width: width,
      height: height,
      scrollMode: 0,
      panel: { child: rowsSizer },
      slider: false,
      mouseWheelScroller: { speed: 0.5 },
    })

    this.sizer.add(headerSizer).add(line).add(scrollablePanel)
  }
}
