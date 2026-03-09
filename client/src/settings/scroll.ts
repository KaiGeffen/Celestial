import 'phaser'
import { Color, Space } from './settings'
import BaseScene, { BaseMenuScene } from '../scene/baseScene'

const ROUNDING = Space.sliderWidth / 2

// TODO Super weird to export a const function like this
export const Scroll: (
  scene: BaseScene | BaseMenuScene,
  invertColor: Boolean,
) => any = (scene: BaseScene | BaseMenuScene, invertColor: Boolean) => {
  return {
    input: 'click',
    track: scene.rexUI.add.roundRectangle(
      0,
      0,
      Space.sliderWidth,
      0,
      0,
      invertColor ? Color.backgroundLight : Color.sliderTrack,
    ),
    thumb: scene.add.image(0, 0, 'icon-Thumb'),
  }
}
