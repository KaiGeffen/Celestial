import { Style, UserSettings } from '../settings/settings'
import { MAX_LEVEL, LEVEL_PROGRESSION } from '../journey/levelProgression'
import BaseScene from '../scene/baseScene'
import ExpBar from 'phaser3-rex-plugins/templates/ui/expbar/ExpBar'

export function createExpBar(
  scene: BaseScene,
  avatarID: number,
  expGained = 0,
  hasBackground = false,
): ExpBar {
  const currentExp =
    UserSettings._get('avatar_experience')[avatarID] - expGained || 0

  const background = hasBackground
    ? scene.add.image(0, 0, 'background-Light')
    : null

  let expBar: ExpBar
  expBar = scene.rexUI.add.expBar({
    width: 300,
    height: 50,
    nameText: scene.add.text(0, 0, 'EXP', Style.basic),
    valueText: scene.add.text(0, 0, '', Style.basic),
    valueTextFormatCallback: function (value, min, max) {
      // This is a janky way to ensure bar shows right amount when reset, but not when exp is being gained
      if (expBar && !expGained) {
        expBar.setNameText(`Level ${expBar.level}`)
      }

      value = Math.floor(value)
      return `${value - min}/${max - min}`
    },
    background: background,
    bar: {
      height: 10,
      barColor: 0xfabd5d,
      trackColor: 0x555555,
      valuechangeCallback: () => {},
    },
    levelCounter: {
      table: function (level) {
        if (level > LEVEL_PROGRESSION.length)
          return LEVEL_PROGRESSION[LEVEL_PROGRESSION.length - 1].totalExp
        return LEVEL_PROGRESSION[level - 1].totalExp
      },
      maxLevel: MAX_LEVEL,
      exp: currentExp,
    },
    easeDuration: 2000,
  })

  // Set starting level
  expBar.setNameText(`Level ${expBar.level}`)

  // Set the level when it changes
  expBar.on('levelup.start', () => {
    expBar.setNameText(`Level ${expBar.level}`)
  })

  // Gain the exp
  expBar.gainExp(expGained)

  return expBar
}
