import 'phaser'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'

import { Color, Space, Style, BBStyle, Ease, Time } from '../settings/settings'
import { GardenSettings } from '@shared/settings'
import Server from '../server'
import { BaseMenuScene } from '../scene/baseScene'

// Tall enough for a full-grown plant and its timer text
const GARDEN_HEIGHT = 200

// Fixed-length arrays below are indexed by plant slot; entries are null where a slot is empty.

// The garden minigame shown in the Play menu: plants grow over real time and can be
// harvested for gold/gem rewards. Owns its own render, per-frame update, and the
// server 'gardenHarvested' listener, cleaning all of it up on scene shutdown.
export default class Garden {
  // The layout element to add to a parent sizer
  readonly sizer: RexUIPlugin.Sizer

  private scene: BaseMenuScene
  private width: number
  private times: (Date | null)[]
  private plants: (Phaser.GameObjects.Image | null)[]
  private timers: (Phaser.GameObjects.Text | null)[]
  private plantSizers: (RexUIPlugin.Sizer | null)[]
  private glowTweens: (Phaser.Tweens.Tween | null)[]
  private clickedHarvestIndex: number | null = null

  constructor(scene: BaseMenuScene, width: number) {
    this.scene = scene
    this.width = width
    this.sizer = this.build()

    scene.game.events.on('gardenHarvested', this.onHarvested, this)
    scene.events.once('shutdown', this.destroy, this)
    scene.events.once('destroy', this.destroy, this)
  }

  destroy(): void {
    this.scene.game.events.off('gardenHarvested', this.onHarvested, this)
    this.glowTweens.forEach((tween) => tween?.stop())
  }

  private build(): RexUIPlugin.Sizer {
    const gardenSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      width: this.width,
      height: GARDEN_HEIGHT,
      space: { item: Space.pad },
    })

    // Initialize fixed-length arrays
    const maxPlants = GardenSettings.MAX_PLANTS
    this.times = new Array(maxPlants).fill(null)
    this.plants = new Array(maxPlants).fill(null)
    this.timers = new Array(maxPlants).fill(null)
    this.plantSizers = new Array(maxPlants).fill(null)
    this.glowTweens = new Array(maxPlants).fill(null)

    // Get garden data from server
    const serverGarden = Server.getUserData().garden || []

    // Add space at the beginning to help center plants
    gardenSizer.addSpace()

    // If the garden is empty, show a hint where the plants would be
    if (!serverGarden.some((plant) => plant)) {
      const txt = this.scene.add
        .text(0, 0, 'Play games to plant your garden', Style.basicStylized)
        .setOrigin(0.5)
      gardenSizer.add(txt, { align: 'center' })
    } else {
      // Create all plant slots (MAX_PLANTS), some may be empty
      for (let i = 0; i < maxPlants; i++) {
        // Create a sizer for each plant slot (plant + timer)
        const plantSizer: RexUIPlugin.Sizer = this.scene.rexUI.add.sizer({
          orientation: 'vertical',
          space: { item: Space.padSmall },
        })

        // Check if there's a plant at this index
        if (i < serverGarden.length && serverGarden[i]) {
          const plantTime = serverGarden[i]
          this.times[i] = plantTime

          const plant = this.scene.add
            .image(0, 0, 'relic-Dandelion')
            .setInteractive()

          // Calculate growth stage
          const growthStage = this.getGrowthStage(plantTime)
          plant.setFrame(growthStage)
          this.plants[i] = plant

          // Only add glow outline if plant is ready to harvest
          const hoursRemaining = this.timeUntilFullyGrown(plantTime)
          const isReady = hoursRemaining <= 0
          if (isReady) {
            const plugin = this.scene.plugins.get('rexOutlinePipeline')
            plugin['add'](plant, {
              thickness: 3,
              outlineColor: Color.outline,
              quality: 0.3,
            })
          }

          // Create timer text below plant - will be updated in update loop
          const timer = this.scene.add
            .text(0, 0, this.formatTimer(plantTime), Style.basicStylized)
            .setOrigin(0.5)
          this.timers[i] = timer

          // Store the index in a closure for the click handler
          const plantIndex = i

          // Hover behavior - only show hint when plant is ready to harvest
          plant
            .on('pointerover', () => {
              const hoursRemaining = this.timeUntilFullyGrown(plantTime)
              if (hoursRemaining <= 0) {
                this.scene.hint.showText('Click to harvest')
              }
            })
            .on('pointerout', () => {
              this.scene.hint.hide()
            })
            .on('pointerdown', () => {
              // Hide hint when clicking
              this.scene.hint.hide()
              const hoursRemaining = this.timeUntilFullyGrown(plantTime)
              if (hoursRemaining <= 0) {
                // Track the clicked index
                this.clickedHarvestIndex = plantIndex

                // NOTE on the server the empty plots aren't counted, so have to adjust the index
                // Count empty plots only up to plantIndex
                const countEmptyPlots = this.plants
                  .slice(0, plantIndex + 1)
                  .filter((plot) => plot === null).length
                const adjustedIndex = plantIndex - countEmptyPlots

                Server.harvestGarden(adjustedIndex)
              }
              // Don't show error if not ready - just do nothing
            })

          plantSizer.add(plant).add(timer)
        }

        gardenSizer.add(plantSizer)
        this.plantSizers[i] = plantSizer
      }
    }

    // Add space at the end to help center plants
    gardenSizer.addSpace()

    return gardenSizer
  }

  private onHarvested(data: {
    success: boolean
    newGarden?: Date[]
    goldReward?: number
    gemReward?: number
  }): void {
    if (!data.success || this.clickedHarvestIndex === null) {
      this.clickedHarvestIndex = null
      return
    }

    const harvestedIndex = this.clickedHarvestIndex
    this.clickedHarvestIndex = null

    // Get the plant sizer for this index
    const plantSizer = this.plantSizers[harvestedIndex]
    if (!plantSizer) {
      return
    }

    const harvestedPlant = this.plants[harvestedIndex]
    const rewardPosition = harvestedPlant
      ? harvestedPlant.getCenter()
      : { x: 0, y: 0 }

    // Clear the plant data at this index
    if (this.plants[harvestedIndex]) {
      this.plants[harvestedIndex].destroy()
      this.plants[harvestedIndex] = null
    }
    if (this.timers[harvestedIndex]) {
      this.timers[harvestedIndex].destroy()
      this.timers[harvestedIndex] = null
    }
    this.times[harvestedIndex] = null

    // Remove the plant and timer from the plant sizer
    plantSizer.removeAll(true)

    const goldText = this.scene.add
      .rexBBCodeText(
        rewardPosition.x,
        rewardPosition.y + 40,
        `[stroke]+${data.goldReward}[/stroke][img=coin]`,
        BBStyle.reward,
      )
      .setOrigin(0.5, 1)

    this.scene.tweens.add({
      targets: goldText,
      y: rewardPosition.y,
      alpha: 0,
      duration: Time.general.rewardFloatMs,
      ease: Ease.basic,
      onComplete: () => goldText.destroy(),
    })

    // Tween the gem rewards if present
    if (data.gemReward > 0) {
      const gemText = this.scene.add
        .rexBBCodeText(
          rewardPosition.x,
          rewardPosition.y + 40,
          `[stroke]+${data.gemReward}[/stroke][img=gem]`,
          BBStyle.reward,
        )
        .setOrigin(0.5, 1)
        .setVisible(false)

      this.scene.tweens.add({
        targets: gemText,
        y: rewardPosition.y,
        alpha: 0,
        delay: Time.general.rewardFloatMs,
        duration: Time.general.rewardFloatMs,
        ease: Ease.basic,
        onStart: () => gemText.setVisible(true),
        onComplete: () => gemText.destroy(),
      })
    }
  }

  private getGrowthStage(plantedTime: Date): number {
    const hoursElapsed =
      GardenSettings.GROWTH_TIME_HOURS - this.timeUntilFullyGrown(plantedTime)
    return Math.min(
      Math.floor(
        (hoursElapsed / GardenSettings.GROWTH_TIME_HOURS) *
          (GardenSettings.GROWTH_STAGES - 1),
      ),
      GardenSettings.GROWTH_STAGES - 1,
    )
  }

  private timeUntilFullyGrown(plantedTime: Date): number {
    const now = new Date()
    const hoursElapsed =
      (now.getTime() - plantedTime.getTime()) / (1000 * 60 * 60)
    return Math.max(GardenSettings.GROWTH_TIME_HOURS - hoursElapsed, 0)
  }

  // Manage the garden timers and visuals; called each frame from the host menu
  update(): void {
    for (let i = 0; i < GardenSettings.MAX_PLANTS; i++) {
      if (this.timers[i] && this.times[i] && this.plants[i]) {
        this.timers[i].setText(this.formatTimer(this.times[i]))

        // Update plant frame based on current growth stage
        const growthStage = this.getGrowthStage(this.times[i])
        this.plants[i].setFrame(growthStage)

        // Check if plant is ready to harvest and animate glow
        const hoursRemaining = this.timeUntilFullyGrown(this.times[i])
        const isReady = hoursRemaining <= 0
        const plant = this.plants[i]

        if (isReady) {
          // Plant is ready - start pulsing glow animation if not already running
          if (!this.glowTweens[i] || !this.glowTweens[i].isActive()) {
            // Stop any existing tween first
            if (this.glowTweens[i]) {
              this.glowTweens[i].stop()
            }

            // Reset alpha to 1 before starting
            plant.setAlpha(1)

            // Create pulsing tween
            this.glowTweens[i] = this.scene.tweens.add({
              targets: plant,
              delay: i * 200,
              alpha: 0.5,
              duration: Time.general.gardenReadyPulseMs,
              ease: 'Sine.easeInOut',
              yoyo: true,
              repeat: -1, // Repeat forever
            })
          }
        } else {
          // Plant is not ready - stop tween and reset alpha
          if (this.glowTweens[i]) {
            this.glowTweens[i].stop()
            this.glowTweens[i] = null
          }
          plant.setAlpha(1)
        }
      }
    }
  }

  private formatTimer(plantedTime: Date): string {
    const hoursRemaining = this.timeUntilFullyGrown(plantedTime)

    if (hoursRemaining <= 0) {
      return 'Ready'
    }

    const totalSeconds = Math.floor(hoursRemaining * 3600)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
}
