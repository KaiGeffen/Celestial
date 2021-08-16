import "phaser"
import PreloadScene from "./scene/preloadScene"
import WelcomeScene from "./scene/welcomeScene"
import GameScene from "./scene/gameScene"
import BuilderScene from "./scene/builderScene"
import CreditsScene from "./scene/creditsScene"
import ChoiceScene from "./scene/choiceScene"
import { AnubisCatalogScene, RobotsCatalogScene, StalkerCatalogScene, CryptCatalogScene, BastetCatalogScene, HorusCatalogScene } from "./scene/catalogScene"
import { TutorialScene1, TutorialScene2 } from "./scene/tutorialScene"
import { ColorSettings, Space } from "./settings"

import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'
import RoundRectanglePlugin from 'phaser3-rex-plugins/plugins/roundrectangle-plugin.js'
import InputTextPlugin from 'phaser3-rex-plugins/plugins/inputtext-plugin.js'
import BBCodeTextPlugin from 'phaser3-rex-plugins/plugins/bbcodetext-plugin.js'
import GlowFilterPipelinePlugin from 'phaser3-rex-plugins/plugins/glowfilterpipeline-plugin.js'
import OutlinePipelinePlugin from 'phaser3-rex-plugins/plugins/outlinepipeline-plugin.js'
// import UIComponent from 'phaser3-rex-plugins/templates/ui/ui-components.js'


const config: Phaser.Types.Core.GameConfig = {
  title: "Celestial",
  width: Space.windowWidth,
  height: Space.windowHeight,
  parent: "game",
  transparent: true,
  dom: {
    createContainer: true
  },
  scene: [PreloadScene, WelcomeScene, CreditsScene,
  ChoiceScene,
  AnubisCatalogScene, RobotsCatalogScene, StalkerCatalogScene, CryptCatalogScene, BastetCatalogScene, HorusCatalogScene,
  GameScene, BuilderScene, TutorialScene1, TutorialScene2],
  scale: {
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  backgroundColor: ColorSettings.background,
  plugins: {
    scene: [{
      key: 'rexUI',
      plugin: UIPlugin,
      mapping: 'rexUI'
    }],
    global: [{
      key: 'rexRoundRectanglePlugin',
      plugin: RoundRectanglePlugin,
      start: true
    },
    {
      key: 'rexInputTextPlugin',
      plugin: InputTextPlugin,
      start: true
    },
    {
      key: 'rexBBCodeTextPlugin',
      plugin: BBCodeTextPlugin,
      start: true
    },
    {
      key: 'rexGlowFilterPipeline',
      plugin: GlowFilterPipelinePlugin,
      start: true
    },
    {
      key: 'rexOutlinePipeline',
      plugin: OutlinePipelinePlugin,
      start: true
    },
    ]
  }
}

export class CelestialGame extends Phaser.Game {
  constructor(config: Phaser.Types.Core.GameConfig) {
    super(config)
  }
}

window.onload = () => {
  var game = new CelestialGame(config)
}
