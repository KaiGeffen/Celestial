import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { Depth, Space, Style, Flags, Color } from '../../settings/settings'
import Region from './baseRegion'
import { MechanicsSettings } from '../../../../shared/settings'
import { GameScene } from '../gameScene'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'

export default class OurScoreRegion extends Region {
  // Move these inside the class as fields so they're set on instantiation
  private width = Space.iconSize * 3 + Space.pad * 4
  private height = Space.todoHandOffset + Space.pad
  private BREATH_X = 30 + Space.padSmall
  private BREATH_Y = this.height - 30 - Space.padSmall

  // For the current state, the maximum and current amount of breath we have
  maxBreath: number
  currentBreath: number

  txtBreath: Phaser.GameObjects.Text
  txtWins: Phaser.GameObjects.Text

  // Icons for each of the states of breath
  breathBasic: Phaser.GameObjects.Image[] = []
  breathSpent: Phaser.GameObjects.Image[] = []
  breathExtra: Phaser.GameObjects.Image[] = []
  breathHover: Phaser.GameObjects.Image[] = []
  breathOom: Phaser.GameObjects.Image[] = []

  // Relic icon
  relic: Phaser.GameObjects.Image

  create(scene: GameScene): this {
    this.scene = scene
    this.container = scene.add
      .container(
        Space.windowWidth - this.width,
        Space.windowHeight - this.height,
      )
      .setDepth(Depth.ourScore)

    // this.createBackground()

    this.createWins()
    this.createRelic()
    this.createBreath()

    return this
  }

  displayState(state: GameModel): void {
    this.maxBreath = state.maxBreath[0]
    this.currentBreath = state.breath[0]

    // Reset the displayed cost
    this.displayCost(0)

    const s = `${state.breath[0]}/${state.maxBreath[0]}`
    this.txtBreath.setText(s)

    // Wins
    this.txtWins.setText(`${state.wins[0]}/5`)

    // Relic
    this.relic.setFrame(state.wins[0])
  }

  // Display a given breath cost
  displayCost(cost: number): void {
    // Each is hidden by the one below
    for (let i = 0; i < MechanicsSettings.BREATH_CAP; i++) {
      this.breathSpent[i].setVisible(i < this.maxBreath)
      this.breathExtra[i].setVisible(i < this.currentBreath)
      this.breathBasic[i].setVisible(
        i < Math.min(this.maxBreath, this.currentBreath),
      )
      this.breathOom[i].setVisible(i < cost)
      this.breathHover[i].setVisible(i < Math.min(cost, this.currentBreath))
    }
  }

  private createBackground(): void {
    const background = this.scene.add
      .rectangle(0, 0, this.width, this.height, Color.backgroundDark)
      .setOrigin(0)

    this.container.add(background)
  }

  private createWins(): void {
    // Create a vertical sizer
    const winsSizer = new Sizer(this.scene, {
      x: this.width / 2,
      y: 0,
      orientation: 'vertical',
      space: { top: Space.padSmall, item: 4 },
    }).setOrigin(0.5, 0)

    this.txtWins = this.scene.add.text(0, 0, '0/5', Style.todoScore)
    const hintWins = this.scene.add.text(0, 0, 'Wins', Style.todoSubtext)

    // Add texts to sizer, centering them horizontally
    winsSizer
      .add(this.txtWins, { align: 'center' })
      .add(hintWins, { align: 'center' })
      .layout()

    this.container.add(winsSizer)
  }

  private createRelic(): void {
    this.relic = this.scene.add
      .image(this.width / 2, 0, 'relic-Dandelion')
      .setOrigin(0.5, 1)
    this.container.add(this.relic)
  }

  private createBreath(): void {
    const x = this.width / 2 + 20
    this.txtBreath = this.scene.add
      .text(x, this.BREATH_Y, '', Style.todoScore)
      .setOrigin(0, 1)

    const hintBreath = this.scene.add
      .text(x, this.BREATH_Y, 'Breath', Style.todoSubtext)
      .setOrigin(0, 0)

    this.container.add([this.txtBreath, hintBreath])

    // Create all of the breath icons
    this.createBreathIcons()
  }

  // Create all of the breath icons
  private createBreathIcons(): void {
    // NOTE Order matters, earliest is on the bottom
    const breathMap = {
      Spent: this.breathSpent,
      Extra: this.breathExtra,
      Basic: this.breathBasic,
      Oom: this.breathOom,
      Hover: this.breathHover,
    }

    for (let key in breathMap) {
      this.createBreathSubtype(key, breathMap[key])
    }
  }

  private createBreathSubtype(
    key: string,
    images: Phaser.GameObjects.Image[],
  ): void {
    const center = [this.BREATH_X, this.BREATH_Y]
    const radius = 30

    // 10 is the max displayed breath, but player could have more
    for (let i = 0; i < MechanicsSettings.BREATH_CAP; i++) {
      // Angle in radians
      const theta = (2 * Math.PI * i) / MechanicsSettings.BREATH_CAP

      const x = center[0] + Math.cos(theta) * radius
      const y = center[1] + Math.sin(theta) * radius
      const s = `icon-Breath${key}`

      // Create the icon, add it to container and list of breath for this subtype
      let image = this.scene.add.image(x, y, s)
      this.container.add(image)
      images.push(image)
    }
  }
}
