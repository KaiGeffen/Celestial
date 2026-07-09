import 'phaser'

import MenuScene from './scene/menuScene'
import { PreloadScene, SigninScene } from './scene/preloadScene'
import HomeScene from './scene/homeScene'
import { StandardMatchScene, RaceMatchScene } from './scene/matchScene'
import JourneyMatchScene from './scene/journeyMatchScene'
import { SpectatorMatchScene } from './scene/spectatorMatchScene'
import TutorialMatchScene from './scene/tutorialScene'
import DeckSelectorScene from './scene/deckSelectorScene'
import DeckEditorScene, {
  DeckEditorJourneyScene,
} from './scene/deckEditorScene'
import MatchHistoryScene from './scene/matchHistoryScene'

import OpeningScene from './scene/openingScene'
import PlaceholderScene from './scene/placeholderScene'
import JourneyScene from './scene/journeyScene'
import RaceScene from './scene/raceScene'

import { Space } from './settings/settings'
import addResizeHandler from './loader/windowResizeManager'
import initializeSplashScreen from './loader/splashLoader'
import initializeErrorHandler, {
  hasWebGL,
  showWebGLUnsupportedMessage,
} from './loader/errorHandler'
import initializeAnalytics from './loader/analyticsLoader'

import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'
import RoundRectanglePlugin from 'phaser3-rex-plugins/plugins/roundrectangle-plugin.js'
import InputTextPlugin from 'phaser3-rex-plugins/plugins/inputtext-plugin.js'
import BBCodeTextPlugin from 'phaser3-rex-plugins/plugins/bbcodetext-plugin.js'
import OutlinePipelinePlugin from 'phaser3-rex-plugins/plugins/outlinepipeline-plugin.js'
import DropShadowPipelinePlugin from 'phaser3-rex-plugins/plugins/dropshadowpipeline-plugin.js'
import ContainerLitePlugin from 'phaser3-rex-plugins/plugins/containerlite-plugin.js'
import GesturesPlugin from 'phaser3-rex-plugins/plugins/gestures-plugin.js'
import StoreScene from './scene/storeScene'
import AnchorPlugin from 'phaser3-rex-plugins/plugins/anchor-plugin.js'
import MapScene from './scene/mapScene'

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
  loader: {
    maxParallelDownloads: 128,
  },
  dom: {
    createContainer: true,
  },
  scene: [
    PreloadScene,
    SigninScene,
    HomeScene,
    MenuScene,
    StandardMatchScene,
    TutorialMatchScene,
    OpeningScene,
    PlaceholderScene,
    DeckSelectorScene,
    DeckEditorScene,
    DeckEditorJourneyScene,
    MapScene,
    MatchHistoryScene,
    StoreScene,
    // Allowing old map based journey mode
    JourneyScene,
    JourneyMatchScene,
    // Race mode
    RaceScene,
    RaceMatchScene,
    SpectatorMatchScene,
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
  // Do any HTML initialization here
  initializeErrorHandler()
  initializeAnalytics()
  initializeSplashScreen()

  // Show message to user if WebGL is missing
  if (!hasWebGL()) {
    showWebGLUnsupportedMessage()
    return
  }

  var game = new CelestialGame(config)
}
