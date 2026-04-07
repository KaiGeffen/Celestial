import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { Depth, Space, Style, Color } from '../../settings/settings'
import Region from './baseRegion'
import { MechanicsSettings } from '../../../../shared/settings'
import { MatchScene } from '../matchScene'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'

export default class OurScoreRegion extends Region {
  // Move these inside the class as fields so they're set on instantiation
  private width = 180
  private height = 180
  private BREATH_X = 90
  private BREATH_Y = 90
  private X_NUDGE = -10

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

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container().setDepth(Depth.ourScore)

    // Anchor to bottom right
    scene.plugins.get('rexAnchor')['add'](this.container, {
      x: `100%-${this.width + this.X_NUDGE}`,
      y: `100%-${this.height}`,
    })

    this.createWins()
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

  private createBreath(): void {
    const breathWheel = this.scene.add.image(
      this.BREATH_X,
      this.BREATH_Y,
      'chrome-breathWheel',
    )
    this.container.add(breathWheel)

    this.createBreathIcons()

    this.txtBreath = this.scene.add
      .text(this.BREATH_X, this.BREATH_Y, '', Style.todoScore)
      .setOrigin(0.5)
    this.container.add(this.txtBreath)
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
    const radius = 60

    // 10 is the max displayed breath, but player could have more
    for (let i = 0; i < MechanicsSettings.BREATH_CAP; i++) {
      // Angle in radians — first slot at top (−π/2), then evenly around the circle
      const theta =
        (2 * Math.PI * i) / MechanicsSettings.BREATH_CAP - Math.PI / 2

      const x = center[0] + Math.cos(theta) * radius
      const y = center[1] + Math.sin(theta) * radius
      const s = `icon-Breath${key}`

      // Top slot (i=0): 0 rad; bottom (i=N/2): π rad; linear in i around the circle
      const rotation =
        (2 * Math.PI * i) / MechanicsSettings.BREATH_CAP

      // Create the icon, add it to container and list of breath for this subtype
      let image = this.scene.add.image(x, y, s).setRotation(rotation)
      this.container.add(image)
      images.push(image)
    }
  }
}
