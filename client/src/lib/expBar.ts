import { Style, UserSettings } from '../settings/settings'
import { MAX_LEVEL, LEVEL_PROGRESSION } from '../data/levelProgression'
import BaseScene from '../scene/baseScene'
import ExpBar from 'phaser3-rex-plugins/templates/ui/expbar/ExpBar'

export function createExpBar(
  scene: BaseScene,
  avatarID: number,
  expGained = 0,
): ExpBar {
  const currentExp = UserSettings._get('avatarExperience')[avatarID] || 0

  const expBar = scene.rexUI.add.expBar({
    width: 300,
    height: 50,
    nameText: scene.add.text(0, 0, 'EXP', Style.basic),
    valueText: scene.add.text(0, 0, '', Style.basic),
    valueTextFormatCallback: function (value, min, max) {
      value = Math.floor(value)
      return `${value}/${max}`
    },
    bar: {
      height: 10,
      barColor: 0xfabd5d,
      trackColor: 0x555555,
      valuechangeCallback: () => {},
    },
    // space: {
    //   left: 10,
    //   right: 10,
    //   top: 10,
    //   bottom: 10,
    //   bar: 5,
    // },
    levelCounter: {
      table: function (level) {
        if (level <= 0) return 0
        if (level > LEVEL_PROGRESSION.length)
          return LEVEL_PROGRESSION[LEVEL_PROGRESSION.length - 1].totalExp
        return LEVEL_PROGRESSION[level - 1].totalExp
      },
      maxLevel: MAX_LEVEL,
      exp: currentExp,
    },
    easeDuration: 1000,
  })

  // Gain the exp
  expBar.gainExp(expGained)

  return expBar
}
