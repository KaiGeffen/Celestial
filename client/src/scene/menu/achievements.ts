import 'phaser'
import { Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import UserDataServer from '../../network/userDataServer'
import { achievementsMeta } from '../../lib/achievementsData'
import { Space } from '../../settings/settings'

const width = 700
const height = 500

export default class AchievementsMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene, width, params)
    this.createHeader('Achievements')
    this.createContent()
    this.layout()
  }

  private createContent() {
    // Get the user's achievements as a map for quick lookup
    const userAchievements = (
      UserDataServer.getUserData()?.achievements || []
    ).reduce(
      (acc, ach) => {
        acc[ach.id] = ach
        return acc
      },
      {} as Record<number, { id: number; progress: number; seen: boolean }>,
    )

    // Header row
    const headerSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      width: width,
    })
    headerSizer
      .add(this.scene.add.text(0, 0, 'Title', Style.basic), { proportion: 2 })
      .add(this.scene.add.text(0, 0, 'Description', Style.basic), {
        proportion: 5,
      })
      .add(this.scene.add.text(0, 0, 'Image', Style.basic), { proportion: 1 })

    // Rows
    const rowsSizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      width: width,
      height: height,
    })

    Object.entries(achievementsMeta).forEach(([id, meta]) => {
      const userAch = userAchievements[Number(id)]
      const userProgress = userAch ? userAch.progress : 0

      // Build description with progress if needed
      let description = meta.description
      if (typeof meta.progress === 'number') {
        description += ` (${userProgress}/${meta.progress})`
      }

      const row = this.scene.rexUI.add.sizer({
        orientation: 'horizontal',
        width: width,
      })
      row
        .add(this.scene.add.text(0, 0, meta.title, Style.basic), {
          proportion: 2,
        })
        .add(this.scene.add.text(0, 0, description, Style.basic), {
          proportion: 5,
        })
        .add(
          this.scene.add
            .image(0, 0, meta.image)
            .setDisplaySize(Space.avatarSize, Space.avatarSize),
          { proportion: 1 },
        )
      rowsSizer.add(row)
    })

    // Scrollable panel
    const scrollablePanel = this.scene.rexUI.add.scrollablePanel({
      width: width,
      height: height,
      scrollMode: 0,
      panel: { child: rowsSizer },
      slider: false,
      mouseWheelScroller: { speed: 0.5 },
    })

    this.sizer.add(headerSizer).add(scrollablePanel)
  }
}
