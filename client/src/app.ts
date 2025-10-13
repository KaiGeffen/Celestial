import 'phaser'

import MenuScene from './scene/menuScene'
import { PreloadScene, SigninScene } from './scene/preloadScene'
import HomeScene from './scene/homeScene'
import {
  StandardMatchScene,
  JourneyMatchScene,
  OldJourneyMatchScene,
} from './scene/matchScene'
import TutorialMatchScene from './scene/tutorialScene'
import { BuilderScene, JourneyBuilderScene } from './scene/builderScene'
import MatchHistoryScene from './scene/matchHistoryScene'

import JourneyScene from './scene/journeyScene'
import PlaceholderScene from './scene/placeholderScene'
import MapJourneyScene from './scene/mapJourneyScene'

import { Space } from './settings/settings'
import addResizeHandler from './loader/windowResizeManager'

import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'
import RoundRectanglePlugin from 'phaser3-rex-plugins/plugins/roundrectangle-plugin.js'
import InputTextPlugin from 'phaser3-rex-plugins/plugins/inputtext-plugin.js'
import BBCodeTextPlugin from 'phaser3-rex-plugins/plugins/bbcodetext-plugin.js'
import GlowFilterPipelinePlugin from 'phaser3-rex-plugins/plugins/glowfilterpipeline-plugin.js'
import DissolvePipelinePlugin from 'phaser3-rex-plugins/plugins/dissolvepipeline-plugin.js'
import OutlinePipelinePlugin from 'phaser3-rex-plugins/plugins/outlinepipeline-plugin.js'
import DropShadowPipelinePlugin from 'phaser3-rex-plugins/plugins/dropshadowpipeline-plugin.js'
import LineProgressPlugin from 'phaser3-rex-plugins/plugins/lineprogress-plugin.js'
import ContainerLitePlugin from 'phaser3-rex-plugins/plugins/containerlite-plugin.js'
import GesturesPlugin from 'phaser3-rex-plugins/plugins/gestures-plugin.js'
import StoreScene from './scene/storeScene'
import AnchorPlugin from 'phaser3-rex-plugins/plugins/anchor-plugin.js'
import CharacterProfileScene from './scene/characterProfileScene'
import MapScene from './scene/MapScene'

const config: Phaser.Types.Core.GameConfig = {
  title: 'Celestial',
  type: Phaser.AUTO,
  width: Space.windowWidth,
  height: Space.windowHeight,
  parent: 'game',
  disableContextMenu: true,
  // pixelArt: true,
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
    StandardMatchScene,
    JourneyMatchScene,
    TutorialMatchScene,
    JourneyBuilderScene,
    PlaceholderScene,
    BuilderScene,
    MapScene,
    JourneyScene,
    MatchHistoryScene,
    StoreScene,
    CharacterProfileScene,

    // Allowing old journey mode
    MapJourneyScene,
    OldJourneyMatchScene,
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
      {
        key: 'rexAnchor',
        plugin: AnchorPlugin,
        start: true,
      },
      {
        key: 'rexLineProgress',
        plugin: LineProgressPlugin,
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
