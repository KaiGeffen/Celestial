import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import Menu from './menu'
import BaseScene from '../baseScene'
import { MatchScene } from '../matchScene'
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
import { rulebookString } from '../../data/rulebook'
import { creditsString } from '../../data/credits'
import { TUTORIAL_LENGTH } from '@shared/settings'
import { openDiscord } from '../../utils/externalLinks'
import Server, { server } from '../../server'
import SearchingRegion from '../matchRegions/searchingRegion'
import { SpectatorMatchScene } from '../spectatorMatchScene'

// TODO Use a non-mock color for the menu background
const COLOR = Color.backgroundLight
/** Alpha for light rectangles behind General / Audio / Rulebook / Credits panels */
const OPTIONS_PANEL_BG_ALPHA = 0.4

// The currently selected tab, preserved if the menu is closed/opened
let selectedTab = 'general'

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
  private tabSelector: Phaser.GameObjects.Image

  constructor(scene: MenuScene, params) {
    super(scene, Math.min(750, Space.windowWidth))

    this.subwidth = this.width - 220

    // The non-menu scene which is active, used for changing scenes
    let activeScene = params.activeScene
    this.createContent()

    this.layout()

    // Anchor the cancel / go-home buttons below the menu (done after layout so
    // the menu's height is known)
    this.createActionButtons(activeScene)

    // After layout is complete, move the highlight to the selected tab button
    const y = this.tabBtns[selectedTab].getGlobalPosition()[1]
    this.tabSelector.setY(y)
  }

  private createContent() {
    // Replace the background
    const background = this.scene.add.image(0, 0, 'chrome-bodyAlt')
    this.sizer.addBackground(background)

    // Only add header if it fits
    if (Space.windowHeight >= 375) {
      this.createHeader('Options', this.width + Space.pad * 2)
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
    this.subpanels['general'] = this.createGeneralPanel()
    this.subpanels['audio'] = this.createAudioPanel()
    this.subpanels['rulebook'] = this.createScrollableTextPanel(rulebookString)
    this.subpanels['credits'] = this.createScrollableTextPanel(creditsString)

    // Put the currently selected tab's contents in the main sizer
    const subpanel = this.subpanels[selectedTab]
    this.subsizer.add(subpanel, { expand: true })
    subpanel.show()
  }

  private createTabs() {
    this.tabSelector = this.scene.add
      .image(0, 0, 'chrome-tabSelector')
      .setOrigin(0, 0.5)
      .setScale(0.3)
    this.scene.plugins.get('rexAnchor')['add'](this.tabSelector, {
      x: `50%-${this.width / 2}`,
    })

    let tabsSizer = this.scene.rexUI.add.fixWidthSizer({
      space: {
        top: Space.pad,
        line: Space.pad,
      },
    })

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

        this.tweenTabSelector(btn.getGlobalPosition()[1])
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
      f: openDiscord,
    }).icon.setTintFill(Color.discordButton)
    tabsSizer.add(container)

    return tabsSizer
  }

  private createGeneralPanel() {
    let sizer = this.scene.rexUI.add
      .sizer({
        orientation: 'vertical',
        space: {
          top: Space.pad,
          bottom: Space.pad,
          left: Space.pad,
          right: Space.pad,
        },
      })
      .addBackground(
        this.scene.add.rectangle(0, 0, 1, 1, COLOR, OPTIONS_PANEL_BG_ALPHA),
      )
      .hide()

    sizer
      .add(
        this.createToggle(
          'Autopass:',
          () => UserSettings._get('autopass'),
          (value) => UserSettings._set('autopass', value),
        ),
        { expand: true },
      )
      .addSpace()
      .add(
        this.createToggle(
          'Can be spectated:',
          () => Server.getUserData().canBeSpectated !== false,
          (value) => Server.setCanBeSpectated(value),
        ),
        { expand: true },
      )
      .addSpace()
      .add(
        this.createToggle(
          'Hotkeys:',
          () => UserSettings._get('hotkeys'),
          (value) => UserSettings._set('hotkeys', value),
        ),
        { expand: true },
      )

    return sizer
  }

  private createAudioPanel() {
    let sizer = this.scene.rexUI.add
      .sizer({
        orientation: 'vertical',
        space: {
          top: Space.pad,
          bottom: Space.pad,
          left: Space.pad,
          right: Space.pad,
        },
      })
      .addBackground(
        this.scene.add.rectangle(0, 0, 1, 1, COLOR, OPTIONS_PANEL_BG_ALPHA),
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

  // A hidden scrollable panel showing a block of BBCode text (rulebook, credits)
  private createScrollableTextPanel(text: string) {
    const sizer = this.scene.rexUI.add.fixWidthSizer({ width: this.subwidth })
    const scrollable = this.scene.rexUI.add
      .scrollablePanel({
        space: {
          left: Space.pad,
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
        this.scene.add.rectangle(0, 0, 1, 1, COLOR, OPTIONS_PANEL_BG_ALPHA),
      )
      .hide()

    const txt = this.scene.rexUI.add.BBCodeText(0, 0, text, {
      ...BBStyle.basicStylized,
      halign: 'left',
      wrap: { width: this.subwidth },
    })

    sizer.add(txt)

    return scrollable
  }

  // A labeled Enabled/Disabled toggle row driven by a getter/setter
  private createToggle(
    label: string,
    getValue: () => boolean,
    setValue: (value: boolean) => void,
  ) {
    const sizer = this.scene.rexUI.add.sizer({ width: this.subwidth })

    const txtHint = this.scene.add.text(0, 0, label, Style.basicStylized)
    sizer.add(txtHint)
    sizer.addSpace()

    const container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    const btn = new Buttons.Basic({
      within: container,
      text: getValue() ? 'Enabled' : 'Disabled',
      f: () => {
        const next = !getValue()
        setValue(next)
        btn.setText(next ? 'Enabled' : 'Disabled')
      },
    })
    sizer.add(container)

    return sizer
  }

  // Build the cancel / go-home action buttons and anchor them below the menu,
  // centered horizontally (x = 50%).
  private createActionButtons(activeScene: BaseScene): void {
    const sizer = this.scene.rexUI.add.sizer({
      space: { item: Space.pad },
    })

    // Cancel button
    sizer.add(this.createCancelButton())

    // For Electron builds, add an exit game button
    if (Flags.isElectronBuild()) {
      const exitContainer = new ContainerLite(
        this.scene,
        0,
        0,
        Space.buttonWidth,
        50,
      )
      new Buttons.Basic({
        within: exitContainer,
        text: 'Exit Game',
        f: () => (window as any).electronAPI.quit(),
      })
      sizer.add(exitContainer)
    }

    // The go-home button (its text/behavior varies by context)
    const container = new ContainerLite(this.scene, 0, 0, Space.buttonWidth, 50)

    // Check if tutorials have been completed
    const missions = UserSettings._get('completedMissions')
    const tutorialsCompleted = missions[TUTORIAL_LENGTH - 1]

    // Button text and callback
    let s = 'Go Home'
    let action: () => void

    if (!tutorialsCompleted) {
      s = 'Skip Tut'
      action = () => {
        // Tell server to skip the tutorials
        Server.skipTutorials()

        // Stop the other active scene
        activeScene.beforeExit()
        activeScene.scene.stop()

        // Stop this menu scene and go to home
        this.scene.scene.stop()
        this.scene.scene.start('HomeScene')
      }
    } else {
      if (activeScene instanceof SpectatorMatchScene) {
        s = 'Exit'
      } else {
        // TODO This is super hacky - refactor searching to be a scene not a region
        if (activeScene instanceof MatchScene) {
          const region: SearchingRegion = activeScene.view.searching as any
          if (region.matchFound) {
            s = 'Surrender'
          }
        }
      }
      action = () => {
        // Stop this menu scene
        this.scene.scene.stop()

        // Exit the active scene
        activeScene.doExit()()

        // Either cancel the search for a match, or forfeit the match
        if (activeScene instanceof MatchScene) {
          // Spectators should never surrender/cancel matchmaking.
          if (activeScene instanceof SpectatorMatchScene) return

          const searchingRegion: SearchingRegion = activeScene.view
            .searching as any

          if (searchingRegion.matchFound) {
            server.send({
              type: 'surrender',
            })
          }
        }
      }
    }

    new Buttons.Basic({
      within: container,
      text: s,
      f: action,
    })
    sizer.add(container)

    // Lay out to compute size, then anchor the row centered just below the
    // menu, and lay out again to apply the new position.
    sizer.layout()
    this.scene.plugins.get('rexAnchor')['add'](sizer, {
      x: `50%`,
      y: `50%+${this.sizer.height / 2 + Space.pad + sizer.height / 2}`,
    })
    sizer.layout()
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

    const txtHint = this.scene.add.text(0, 0, s, Style.basicStylized)
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

      track: this.scene.add.image(0, 0, 'icon-TrackHorizontal'),
      thumb: this.scene.add.image(0, 0, 'icon-ThumbHorizontal').setScale(0.5),
      input: 'click',

      value: value,
      valuechangeCallback: callback,
    })
  }

  // Tween the higlight moving to the given y (Flush with left side of menu)
  private tweenTabSelector(y: number): void {
    this.scene.tweens.add({
      targets: this.tabSelector,
      y: y,
      duration: Time.general.optionsTabSlideMs,
      ease: 'Sine.easeInOut',
    })
  }
}
