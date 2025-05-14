import 'phaser'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'

import RoundRectangle from 'phaser3-rex-plugins/plugins/roundrectangle.js'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import Menu from './menu'
import BaseScene from '../baseScene'
import {
  Space,
  Color,
  Style,
  BBStyle,
  UserSettings,
  Time,
  Flags,
} from '../../settings/settings'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import MenuScene from '../menuScene'
import { rulebookString } from '../../catalog/rulebook'
import { creditsString } from '../../catalog/credits'
import { TUTORIAL_LENGTH } from '../../../../shared/settings'

// TODO Use a non-mock color for the menu background
const COLOR = Color.backgroundLight

// The currently selected tab, preserved if the menu is closed/opened
var selectedTab = 'general'

export default class OptionsMenu extends Menu {
  // Width of the subpanel that shows selected tab's contents
  subwidth: number

  // Each of the subpanels displayed based on which tab is selected
  subpanels: Record<string, any> = {}

  // The sizer which holds the tabs and active subpanel
  subsizer

  // Mapping from subpanel anem to the button for that tab
  tabBtns: Record<string, Button> = {}

  // The highlight for the selected tab
  highlight: Phaser.GameObjects.Rectangle

  constructor(scene: MenuScene, params) {
    super(scene, Math.min(750, Space.windowWidth))

    this.subwidth = this.width - 220

    // The non-menu scene which is active, used for changing scenes
    let activeScene = params.activeScene
    this.createContent(activeScene)

    this.layout()

    // After layout is complete, move the highlight to the selected tab button
    const x = (Space.windowWidth - this.width - Space.pad * 2) / 2
    const y = this.tabBtns[selectedTab].getGlobalPosition()[1] - 4
    this.highlight.setPosition(x, y)
  }

  private createContent(activeScene: BaseScene) {
    // Only add header if it fits
    if (Space.windowHeight >= 375) {
      let header = this.createHeader('Options', this.width + Space.pad * 2)
    }

    // Sizer with tabs on left, contents on right
    this.subsizer = this.scene.rexUI.add.sizer({
      space: {
        item: Space.pad / 2,
        left: Space.pad,
        right: Space.pad,
      },
    })
    this.sizer.add(this.subsizer)

    // Create the different tabs that user can select
    let tabs = this.createTabs()
    this.subsizer.add(tabs).addSpace()

    // Create a sizer for each of the tabs
    this.subpanels['general'] = this.createGeneralPanel(activeScene)
    this.subpanels['audio'] = this.createAudioPanel()
    this.subpanels['rulebook'] = this.createRulebookPanel()
    this.subpanels['credits'] = this.createCreditsPanel()

    // Put the currently selected tab's contents in the main sizer
    const subpanel = this.subpanels[selectedTab]
    this.subsizer.add(subpanel, { expand: true })
    subpanel.show()
  }

  private createTabs() {
    // Create a rectangle to show which tab is selected
    const highlightWidth =
      Space.buttonWidth +
      Space.pad * 2 +
      Space.padSmall +
      (Flags.mobile ? 10 : 0)
    const height = Flags.mobile ? 50 : 90
    this.highlight = this.scene.add
      .rectangle(0, 0, highlightWidth, height, COLOR, 1)
      .setOrigin(0, 0.5)

    let tabsSizer = this.scene.rexUI.add.fixWidthSizer(
      Flags.mobile
        ? {}
        : {
            space: {
              top: Space.pad,
              line: Space.pad,
            },
          },
    )

    tabsSizer.addNewLine()

    // Add a button for each of the tabs
    const tabStrings = ['general', 'audio', 'rulebook', 'credits']
    for (let i = 0; i < tabStrings.length; i++) {
      let container = new ContainerLite(
        this.scene,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )
      const s = tabStrings[i].charAt(0).toUpperCase() + tabStrings[i].slice(1)
      const height = Space.buttonHeight + Space.pad
      let btn = new Buttons.Text(
        container,
        0,
        0,
        s,
        () => {},
        Space.buttonWidth,
        height,
      )

      btn.setOnClick(() => {
        // Remove and hide the old subpanel
        const oldPanel = this.subpanels[selectedTab]

        this.subsizer.remove(oldPanel)
        oldPanel.hide()

        // Remember which tab is newly selected and show that
        selectedTab = tabStrings[i]
        const newPanel = this.subpanels[tabStrings[i]]

        this.subsizer.add(newPanel, { expand: true })
        newPanel.show()

        this.layout()

        this.tweenHighlight(btn.getGlobalPosition()[1])
      })

      tabsSizer.add(container).addNewLine()

      // Add the btn to dictionary
      this.tabBtns[tabStrings[i]] = btn
    }

    // Add the discord button
    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Icon({
      name: 'Discord',
      within: container,
    })
    tabsSizer.add(container)

    return tabsSizer
  }

  private createGeneralPanel(activeScene: BaseScene) {
    let sizer = this.scene.rexUI.add
      .sizer({
        orientation: 'vertical',
        space: {
          top: Space.pad,
          bottom: Space.pad,
          left: Space.pad / 2,
          right: Space.pad,
        },
      })
      .addBackground(
        this.scene.add.rectangle(0, 0, 1, 1, Color.backgroundLight),
      )
      .hide()

    // Allow user to skip Tutorial, if they haven't completed it
    const missions = UserSettings._get('completedMissions')
    if (!missions[TUTORIAL_LENGTH - 1]) {
      sizer
        .add(this.createSkipTutorial(activeScene), { expand: true })
        .addSpace()
    }

    sizer
      .add(this.createAutopass(), { expand: true })
      .addSpace()
      .add(this.createHotkeys(), { expand: true })
      .addSpace()
      .add(this.createQuit(activeScene), { expand: true })

    return sizer
  }
  private createAudioPanel() {
    let sizer = this.scene.rexUI.add
      .sizer({
        orientation: 'vertical',
        space: {
          top: Space.pad,
          bottom: Space.pad,
          left: Space.pad / 2,
          right: Space.pad,
        },
      })
      .addBackground(
        this.scene.add.rectangle(0, 0, 1, 1, Color.backgroundLight),
      )
      .hide()

    // Elements used in the below callbacks
    const music = document.getElementById('music') as HTMLAudioElement
    const dialogAudio = document.getElementById('dialog') as HTMLAudioElement

    // Add each sizer
    sizer
      .add(
        this.createVolumeSection(
          'Master Volume:',
          UserSettings._get('volume'),
          (value) => {
            UserSettings._set('volume', value)
            this.scene.sound.volume = value * 5

            // Ensure that all other audio is playing, since this may have transitioned from 0 volume
            music.volume = value * UserSettings._get('musicVolume')
            music.play()
            dialogAudio.volume = value * UserSettings._get('dialogVolume')
          },
        ),
        { expand: true },
      )
      .addSpace()
      .add(
        this.createVolumeSection(
          'Music Volume:',
          UserSettings._get('musicVolume'),
          (value) => {
            UserSettings._set('musicVolume', value)

            music.volume = value * UserSettings._get('volume')
            music.play()
          },
        ),
        { expand: true },
      )
      .addSpace()
      .add(
        this.createVolumeSection(
          'Dialog Volume:',
          UserSettings._get('dialogVolume'),
          (value) => {
            UserSettings._set('dialogVolume', value)

            dialogAudio.volume = value * UserSettings._get('volume')
          },
        ),
        { expand: true },
      )

    return sizer
  }

  private createRulebookPanel() {
    let sizer = this.scene.rexUI.add.fixWidthSizer({ width: this.subwidth })
    let scrollable = this.scene.rexUI.add
      .scrollablePanel({
        space: {
          // top: Space.pad,
          // bottom: Space.pad,
          left: Space.pad / 2,
          right: Space.pad,
        },

        panel: {
          child: sizer,
        },

        mouseWheelScroller: {
          speed: 1,
        },
      })
      .addBackground(
        this.scene.add.rectangle(0, 0, 1, 1, Color.backgroundLight),
      )
      .hide()

    // Add text to the scrollable panel
    let txt = this.scene.rexUI.add.BBCodeText(0, 0, rulebookString, {
      ...BBStyle.optionsBlock,
      wrap: { width: this.subwidth },
    })

    sizer.add(txt)

    return scrollable
  }

  private createCreditsPanel() {
    let sizer = this.scene.rexUI.add.fixWidthSizer({ width: this.subwidth })
    let scrollable = this.scene.rexUI.add
      .scrollablePanel({
        space: {
          left: Space.pad / 2,
          right: Space.pad,
        },

        panel: {
          child: sizer,
        },

        mouseWheelScroller: {
          speed: 1,
        },
      })
      .addBackground(
        this.scene.add.rectangle(0, 0, 1, 1, Color.backgroundLight),
      )
      .hide()

    // Add text to the scrollable panel
    let txt = this.scene.rexUI.add.BBCodeText(0, 0, creditsString, {
      ...BBStyle.optionsBlock,
      wrap: { width: this.subwidth },
    })

    sizer.add(txt)

    return scrollable
  }

  // Elements within the panels:
  private createSkipTutorial(activeScene: BaseScene) {
    let sizer = this.scene.rexUI.add.sizer({ width: this.subwidth })

    let txtHint = this.scene.add.text(0, 0, 'Skip Tutorial:', Style.basic)
    sizer.add(txtHint)
    sizer.addSpace()

    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    let btn = new Buttons.Basic({
      within: container,
      text: 'Skip',
      f: () => {
        this.scene.scene.start('MenuScene', {
          menu: 'confirm',
          callback: () => {
            // Complete each mission in the intro
            for (let i = 0; i < TUTORIAL_LENGTH; i++) {
              UserSettings._setIndex('completedMissions', i, true)
            }

            // Stop the other active scene
            activeScene.beforeExit()
            activeScene.scene.stop()

            // Stop this scene and start the home scene
            this.scene.scene.start('HomeScene')
          },
          hint: 'skip the tutorial',
        })
      },
    })
    sizer.add(container)

    return sizer
  }

  private createAutopass() {
    let sizer = this.scene.rexUI.add.sizer({ width: this.subwidth })

    let txtHint = this.scene.add.text(0, 0, 'Autopass:', Style.basic)
    sizer.add(txtHint)
    sizer.addSpace()

    const s = UserSettings._get('autopass') ? 'Enabled' : 'Disabled'
    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    let btn = new Buttons.Basic({
      within: container,
      text: s,
      f: () => {
        if (UserSettings._get('autopass')) {
          btn.setText('Disabled')
          UserSettings._set('autopass', false)
        } else {
          btn.setText('Enabled')
          UserSettings._set('autopass', true)
        }
      },
    })
    sizer.add(container)

    return sizer
  }

  private createHotkeys(): import('phaser').GameObjects.GameObject {
    let sizer = this.scene.rexUI.add.sizer({ width: this.subwidth })

    let txtHint = this.scene.add.text(0, 0, 'Hotkeys:', Style.basic)
    sizer.add(txtHint)
    sizer.addSpace()

    const s = UserSettings._get('hotkeys') ? 'Enabled' : 'Disabled'
    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    let btn = new Buttons.Basic({
      within: container,
      text: s,
      f: () => {
        if (UserSettings._get('hotkeys')) {
          btn.setText('Disabled')
          UserSettings._set('hotkeys', false)
        } else {
          btn.setText('Enabled')
          UserSettings._set('hotkeys', true)
        }
      },
    })
    sizer.add(container)

    return sizer
  }

  private createQuit(activeScene: BaseScene) {
    let sizer = this.scene.rexUI.add.sizer({ width: this.subwidth })

    let containerQuit = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      50,
    )
    sizer
      .addSpace()
      .add(this.createCancelButton())
      .addSpace()
      .add(containerQuit)
      .addSpace()

    new Buttons.Basic({
      within: containerQuit,
      text: 'Quit',
      f: () => {
        // Stop the other active scene
        activeScene.beforeExit()
        activeScene.scene.stop()

        // Stop this scene and start the home scene
        this.scene.scene.start('HomeScene')
      },
    })

    return sizer
  }

  private createVolumeSection(
    s: string,
    initialValue: number,
    callback: (value) => void,
  ) {
    const sizer = this.scene.rexUI.add.sizer({
      width: this.subwidth,
      orientation: 'vertical',
      space: { item: Space.pad },
    })

    const txtHint = this.scene.add.text(0, 0, s, Style.basic)
    sizer.add(txtHint)

    const slider = this.getSlider(initialValue, callback)
    sizer.add(slider)

    return sizer
  }

  private getSlider(value: number, callback: (value: number) => void) {
    const factory = this.scene.rexUI.add
    return factory.slider({
      width: this.subwidth,
      height: 20,
      orientation: 'x',

      track: this.scene.rexUI.add.roundRectangle(
        0,
        0,
        this.subwidth,
        8,
        10,
        Color.sliderTrack,
      ),
      indicator: this.scene.rexUI.add.roundRectangle(
        0,
        0,
        0,
        0,
        12,
        Color.sliderIndicator,
      ),
      thumb: this.scene.add.image(0, 0, 'icon-Thumb'),
      input: 'click',

      value: value,
      valuechangeCallback: callback,
    })
  }

  // Tween the higlight moving to the given y (Flush with left side of menu)
  private tweenHighlight(y: number): void {
    this.scene.tweens.add({
      targets: this.highlight,
      x: (Space.windowWidth - this.width - Space.pad * 2) / 2,
      y: y - 4,

      duration: Time.optionsTabSlide,
      ease: 'Sine.easeInOut',
    })
  }
}
