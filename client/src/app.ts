import 'phaser'

import MenuScene from './scene/menuScene'
import { PreloadScene, SigninScene } from './scene/preloadScene'
import HomeScene from './scene/homeScene'
import { StandardGameScene, AdventureGameScene } from './scene/gameScene'
import TutorialGameScene from './scene/tutorialScene'
import { BuilderScene, AdventureBuilderScene } from './scene/builderScene'
import MatchHistoryScene from './scene/matchHistoryScene'

import AdventureScene from './scene/adventureScene'
import PlaceholderScene from './scene/placeholderScene'

import { Color, Space, Flags } from './settings/settings'
import addResizeHandler from './loader/windowResizeManager'

import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'
import RoundRectanglePlugin from 'phaser3-rex-plugins/plugins/roundrectangle-plugin.js'
import InputTextPlugin from 'phaser3-rex-plugins/plugins/inputtext-plugin.js'
import BBCodeTextPlugin from 'phaser3-rex-plugins/plugins/bbcodetext-plugin.js'
import GlowFilterPipelinePlugin from 'phaser3-rex-plugins/plugins/glowfilterpipeline-plugin.js'
import DissolvePipelinePlugin from 'phaser3-rex-plugins/plugins/dissolvepipeline-plugin.js'
import OutlinePipelinePlugin from 'phaser3-rex-plugins/plugins/outlinepipeline-plugin.js'
import DropShadowPipelinePlugin from 'phaser3-rex-plugins/plugins/dropshadowpipeline-plugin.js'
import ContainerLitePlugin from 'phaser3-rex-plugins/plugins/containerlite-plugin.js'
import GesturesPlugin from 'phaser3-rex-plugins/plugins/gestures-plugin.js'
// import UIComponent from 'phaser3-rex-plugins/templates/ui/ui-components.js'

const config: Phaser.Types.Core.GameConfig = {
  title: 'Celestial',
  type: Phaser.AUTO,
  width: Space.windowWidth,
  height: Space.windowHeight,
  parent: 'game',
  disableContextMenu: true,
  pixelArt: true,
  powerPreference: 'high-performance',
  transparent: true,
  dom: {
    createContainer: true,
  },
  scene: [
    PreloadScene,
    SigninScene,
    HomeScene,
    MenuScene,
    StandardGameScene,
    AdventureGameScene,
    TutorialGameScene,
    AdventureBuilderScene,
    PlaceholderScene,
    BuilderScene,
    AdventureScene,
    MatchHistoryScene,
  ],
  plugins: {
    scene: [
      {
        key: 'rexUI',
        plugin: UIPlugin,
        mapping: 'rexUI',
      },
      {
        key: 'rexGestures',
        plugin: GesturesPlugin,
        mapping: 'rexGestures',
      },
    ],
    global: [
      {
        key: 'rexRoundRectanglePlugin',
        plugin: RoundRectanglePlugin,
        start: true,
      },
      {
        key: 'rexInputTextPlugin',
        plugin: InputTextPlugin,
        start: true,
      },
      {
        key: 'rexBBCodeTextPlugin',
        plugin: BBCodeTextPlugin,
        start: true,
      },
      {
        key: 'rexGlowFilterPipeline',
        plugin: GlowFilterPipelinePlugin,
        start: true,
      },
      {
        key: 'rexDissolvePipeline',
        plugin: DissolvePipelinePlugin,
        start: true,
      },
      {
        key: 'rexOutlinePipeline',
        plugin: OutlinePipelinePlugin,
        start: true,
      },
      {
        key: 'rexDropShadowPipeline',
        plugin: DropShadowPipelinePlugin,
        start: true,
      },
      {
        key: 'rexContainerLitePlugin',
        plugin: ContainerLitePlugin,
        start: true,
      },
    ],
  },
}

export class CelestialGame extends Phaser.Game {
  constructor(config: Phaser.Types.Core.GameConfig) {
    super(config)

    addResizeHandler(this)
  }
}

window.onload = () => {
  var game = new CelestialGame(config)
}
