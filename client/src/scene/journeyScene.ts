import 'phaser'
import BaseScene from './baseScene'
import {
  Style,
  Space,
  Color,
  UserSettings,
  Time,
  Ease,
} from '../settings/settings'
import Buttons from '../lib/buttons/buttons'
import Button from '../lib/buttons/button'

import Catalog from '../../../shared/state/catalog'
import { journeyNode, journeyData } from '../journey/journey'

// TODO Make consistent with Journey (Change journey to journey or vice verca)
export default class JourneyScene extends BaseScene {
  panDirection

  map: Phaser.GameObjects.Image

  animatedBtns: Button[]

  incompleteIndicators: Button[] = []

  isDragging = false

  constructor() {
    super({
      key: 'JourneyScene',
    })
  }

  create(params): void {
    super.create()

    // Create the background
    this.map = this.add.image(0, 0, 'journey-Map').setOrigin(0).setInteractive()
    this.enableDrag()

    // Bound camera on this map
    this.cameras.main.setBounds(0, 0, this.map.width, this.map.height)

    // Add button for help menu
    this.createHelpButton()

    // Add all of the available nodes
    this.addJourneyData()

    if (params.stillframe !== undefined) {
      this.createStillframe(params)
    } else {
      // Add scroll functionality by default if not showing a stillframe
      this.enableScrolling()
    }

    // Make up pop-up for the card you just received, if there is one
    if (params.card) {
      this.createCardPopup(params)
    } else if (params.txt) {
      this.createTipPopup(params)
    }

    // Scroll to the given position
    const coords = UserSettings._get('journeyCoordinates')
    this.cameras.main.scrollX = coords.x
    this.cameras.main.scrollY = coords.y

    // Create indicators for where incomplete missions are
    this.createIncompleteIndicators()
  }

  update(time, delta): void {
    // If pointer is released, stop panning
    if (!this.input.activePointer.isDown) {
      this.panDirection = undefined
    }

    if (this.panDirection !== undefined) {
      JourneyScene.moveCamera(
        this.cameras.main,
        this.panDirection[0],
        this.panDirection[1],
      )
    }

    // Dragging
    if (this.isDragging && this.panDirection === undefined) {
      const camera = this.cameras.main
      const pointer = this.input.activePointer

      const dx = ((pointer.x - pointer.downX) * delta) / 100
      const dy = ((pointer.y - pointer.downY) * delta) / 100

      JourneyScene.moveCamera(camera, dx, dy)
    }

    // Switch the frame of the animated elements every frame
    // Go back and forth from frame 0 to 1
    ;[...this.animatedBtns, ...this.incompleteIndicators].forEach((btn) => {
      // Switch every half second, roughly
      let frame = Math.floor((2 * time) / 1000) % 2 === 0 ? 0 : 1
      btn.setFrame(frame)
    })

    // Adjust alpha/location of each indicator
    this.adjustIndicators()
  }

  private createHelpButton(): void {
    const container = this.add.container().setDepth(10)
    new Buttons.Basic({
      within: container,
      text: 'Help',
      f: () => {
        this.scene.launch('MenuScene', {
          menu: 'help',
          callback: () => {
            this.scene.start('TutorialMatchScene', { missionID: 0 })
          },
        })
      },
      muteClick: true,
    }).setNoScroll()

    // Anchor in top right
    const dx = Space.buttonWidth / 2 + Space.iconSize + Space.pad * 2
    const dy = Space.buttonHeight / 2 + Space.pad
    this.plugins.get('rexAnchor')['add'](container, {
      x: `100%-${dx}`,
      y: `0%+${dy}`,
    })
  }

  // Create a popup for the card specified in params
  private createCardPopup(params): void {
    this.scene.launch('MenuScene', {
      menu: 'message',
      title: 'Card Unlocked!',
      s: params.txt,
      card: params.card,
    })

    // Clear params
    params.txt = ''
    params.card = undefined
  }

  // Create a popup for the tip
  private createTipPopup(params): void {
    this.scene.launch('MenuScene', {
      menu: 'message',
      title: 'Tip',
      s: params.txt,
    })

    // Clear params
    params.txt = ''
    params.card = undefined
  }

  // Create indicators for any incomplete nodes on the map out of the camera's view
  private createIncompleteIndicators(): void {
    this.incompleteIndicators = []
    this.animatedBtns.forEach((btn) => {
      const indicator = new Buttons.Mission(
        this,
        0,
        0,
        () => {
          const camera = this.cameras.main
          camera.centerOn(btn.icon.x, btn.icon.y)
          JourneyScene.rememberCoordinates(camera)
        },
        'mission',
        true,
      ).setNoScroll()

      this.incompleteIndicators.push(indicator)
    })
  }

  // Create a stillframe animation specified in params
  private createStillframe(params): void {
    // TODO Make dry with the searching tutorial class implementation

    // Height of the tutorial text
    const TEXT_HEIGHT = 225

    let container = this.add.container().setDepth(11)

    let img = this.add
      .image(Space.windowWidth / 2, 0, `journey-Story 4`)
      .setOrigin(0.5, 0)
      .setInteractive()

    // Ensure that image fits perfectly in window
    const scale = Space.windowWidth / img.displayWidth
    img.setScale(scale)

    // Text background
    let background = this.add
      .rectangle(
        0,
        Space.windowHeight - TEXT_HEIGHT,
        Space.windowWidth,
        TEXT_HEIGHT,
        Color.backgroundLight,
      )
      .setOrigin(0)
      .setAlpha(0.8)
    this.plugins.get('rexDropShadowPipeline')['add'](background, {
      distance: 3,
      shadowColor: 0x000000,
    })

    // Add text
    let txt = this.add
      .text(0, 0, '', Style.stillframe)
      .setWordWrapWidth(Space.stillframeTextWidth)

    const s =
      "Impressive, all that life, all that wonder. You are welcomed in of course. But if I might share one thing that I've learned in my time here... It's that someday, everything blows away."

    let textbox = this.rexUI.add
      .textBox({
        text: txt,
        x: Space.pad,
        y: background.y,
        space: {
          left: Space.pad,
          right: Space.pad,
          top: Space.pad,
          bottom: Space.pad,
        },
        page: {
          maxLines: 0, // 0 = unlimited lines
        },
      })
      .start(s, 50)
      .setOrigin(0)

    container.add([img, background, txt, textbox])

    // Add an okay button
    let btn = new Buttons.Basic({
      within: container,
      text: 'Continue',
      x: Space.windowWidth - Space.pad - Space.buttonWidth / 2,
      y: Space.windowHeight - Space.pad - Space.buttonHeight / 2,
      f: () => {
        // If typing isn't complete, complete it
        if (textbox.isTyping) {
          textbox.stop(true)
        }
        // Otherwise move on to the next frame
        else {
          this.tweens.add({
            targets: container,
            alpha: 0,
            duration: Time.stillframeFade,
            onComplete: () => {
              container.setVisible(false)
              container.alpha = 1
            },
          })

          // Allow scrolling once the stillframe is gone
          this.enableScrolling()

          this.scene.start('PlaceholderScene')
        }
      },
    })

    // Scroll the image going down
    this.add.tween({
      targets: img,
      duration: 6000,
      ease: Ease.stillframe,
      y: Space.windowHeight - img.displayHeight,
      onStart: () => {
        img.y = 0
      },
    })

    // Set the param to undefined so it doesn't persist
    params.stillframe = undefined

    // Reposition the stillframe to be visible to the camera
    const coords = UserSettings._get('journeyCoordinates')
    container.setPosition(coords.x, coords.y)
  }

  // Add all of the missions to the panel
  private addJourneyData(): void {
    let completed: boolean[] = UserSettings._get('completedMissions')

    let unlockedMissions = journeyData.filter(function (mission) {
      // Return whether any of the necessary conditions have been met
      // Prereqs are in CNF (Or of sets of Ands)
      return mission.prereq.some(function (prereqs, _) {
        return prereqs.every(function (id, _) {
          return completed[id]
        })
      })
    })

    // Add each of the journeys as its own line
    this.animatedBtns = []
    unlockedMissions.forEach((mission: journeyNode) => {
      // For now, it's all either the waving figure or ? icon
      const nodeType = 'deck' in mission ? 'Mission' : 'QuestionMark'
      let btn = new Buttons.Mission(
        this,
        mission.x,
        mission.y,
        this.missionOnClick(mission),
        nodeType,
      )

      // If user hasn't completed this mission, animate it
      if (!completed[mission.id]) {
        this.animatedBtns.push(btn)
      } else {
        btn.setAlpha(0.5)
      }
    })
  }

  // Return the function for what happens when the given mission node is clicked on
  private missionOnClick(mission: journeyNode): () => void {
    return () => {
      if ('deck' in mission) {
        this.scene.start('JourneyBuilderScene', mission)
      } else {
        // Complete the mission
        UserSettings._setIndex('completedMissions', mission.id, true)

        // Show tip
        if ('tip' in mission) {
          this.scene.start('JourneyScene', { txt: mission.tip })
        }
        // Unlock the card
        else if ('card' in mission) {
          UserSettings._setIndex('inventory', mission.card, true)

          const card = Catalog.getCardById(mission.card)
          if (card === undefined) {
            this.scene.start('JourneyScene', { txt: 'Error, card undefined' })
          } else {
            this.scene.start('JourneyScene', {
              txt: card.story,
              card: card,
            })
          }
        }
      }
    }
  }

  private enableScrolling(): void {
    let camera = this.cameras.main

    this.input.on(
      'gameobjectwheel',
      (pointer, gameObject, dx, dy, dz, event) => {
        JourneyScene.moveCamera(camera, dx, dy)
      },
    )
  }

  private enableDrag(): void {
    // Arrow pointing from the start of the drag to current position
    const arrow = this.scene.scene.add
      .image(0, 0, 'icon-Arrow')
      .setAlpha(0)
      .setScrollFactor(0)

    // Map can be dragged
    this.input
      .setDraggable(this.map)
      .on('dragstart', (event) => {
        this.isDragging = true
      })
      .on('drag', (event) => {
        const angle = Phaser.Math.Angle.Between(
          event.downX,
          event.downY,
          event.x,
          event.y,
        )
        arrow
          .setPosition(event.downX, event.downY)
          .setRotation(angle + Phaser.Math.DegToRad(90))
          .setAlpha(1)
      })
      .on('dragend', () => {
        this.isDragging = false
        arrow.setAlpha(0)
      })
  }

  private adjustIndicators(): void {
    // Find the intersection between a line from the btn to camer's center
    const camera = this.cameras.main
    const rect = camera.worldView

    // Adjust each indicator
    for (let i = 0; i < this.animatedBtns.length; i++) {
      const btn = this.animatedBtns[i]

      // TODO Use set bounds of camera to lock it to the map image instead of math
      const line = new Phaser.Geom.Line(
        btn.icon.x,
        btn.icon.y,
        camera.scrollX + camera.centerX,
        camera.scrollY + camera.centerY,
      )

      const intersects = Phaser.Geom.Intersects.GetLineToRectangle(line, rect)

      // If btn is on screen, hide this button's indicator indicator
      if (intersects.length === 0) {
        this.incompleteIndicators[i].setAlpha(0)
      }
      // Otherwise, place the indicator at the intersection of worldview and line to camera's center
      else {
        const intersect = intersects[0]

        this.incompleteIndicators[i]
          .setAlpha(1)
          .setPosition(
            intersect.x - camera.scrollX,
            intersect.y - camera.scrollY,
          )
      }
    }
  }

  private static moveCamera(camera, dx, dy): void {
    camera.scrollX = Math.max(0, camera.scrollX + dx)
    camera.scrollY = Math.max(0, camera.scrollY + dy)

    // Remember the camera position
    JourneyScene.rememberCoordinates(camera)
  }

  // Remember the position of the camera so the next time this scene launches it's in the same place
  private static rememberCoordinates(camera): void {
    UserSettings._set('journeyCoordinates', {
      x: camera.scrollX,
      y: camera.scrollY,
    })
  }
}
