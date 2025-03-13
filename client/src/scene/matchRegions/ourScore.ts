import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { Depth, Space, Style, Flags } from '../../settings/settings'
import Region from './baseRegion'
import { MechanicsSettings } from '../../../../shared/settings'
import { GameScene } from '../gameScene'

export default class ScoreRegion extends Region {
  // For the current state, the maximum and current amount of breath we have
  maxBreath: number
  currentBreath: number

  // Stack amount
  txtDeck: Phaser.GameObjects.Text
  txtDiscard: Phaser.GameObjects.Text
  txtRemoved: Phaser.GameObjects.Text

  txtWins: Phaser.GameObjects.Text
  txtBreath: Phaser.GameObjects.Text

  // Icons for each of the states of breath
  breathBasic: Phaser.GameObjects.Image[] = []
  breathSpent: Phaser.GameObjects.Image[] = []
  breathExtra: Phaser.GameObjects.Image[] = []
  breathHover: Phaser.GameObjects.Image[] = []
  breathOom: Phaser.GameObjects.Image[] = []

  // Center at 163, 53 from right bottom corner
  BREATH_X = Space.windowWidth - (Flags.mobile ? 40 : 163)
  BREATH_Y = Space.windowHeight - (Flags.mobile ? Space.handHeight / 2 : 53)

  create(scene: GameScene): ScoreRegion {
    this.scene = scene
    this.container = scene.add.container().setDepth(Depth.ourScore)

    this.createStacks()

    // Create all of the breath icons
    this.createBreathIcons()
    this.createWins()

    const x = Space.windowWidth - (Flags.mobile ? 5 : 124)
    const y = Space.windowHeight - (Flags.mobile ? Space.handHeight + 15 : 114)

    this.txtBreath = scene.add
      .text(
        Flags.mobile ? this.BREATH_X : x,
        this.BREATH_Y + 5,
        '',
        Style.basic,
      )
      .setOrigin(Flags.mobile ? 0.5 : 0, 0.5)

    // Add each of these objects to container
    this.container.add(this.txtBreath)

    return this
  }

  displayState(state: GameModel): void {
    this.maxBreath = state.maxBreath[0]
    this.currentBreath = state.breath[0]

    // Reset the displayed cost
    this.displayCost(0)

    const s = `${state.breath[0]}/${state.maxBreath[0]}`
    this.txtBreath.setText(s)

    this.txtWins.setText(`${Flags.mobile ? 'Wins: ' : ''}${state.wins[0]}/5`)
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

  private createStacks(): void {
    const x = Space.windowWidth - 250
    const x1 = x + 50
    const y = Space.windowHeight - 60
    const dy = 80
    const textOffset = 4

    // Discard
    this.container.add([
      this.scene.add.image(x, y, 'icon-Discard'),
      (this.txtDiscard = this.scene.add
        .text(x1, y + textOffset, '10', Style.todoPileCount)
        .setOrigin(0, 1)),
      this.scene.add
        .text(x1, y + textOffset, 'Discard', Style.todoHint)
        .setOrigin(0),
    ])

    // Deck
    this.container.add([
      this.scene.add.image(x, y - dy, 'icon-Deck'),
      (this.txtDeck = this.scene.add
        .text(x1, y - dy + textOffset, '4', Style.todoPileCount)
        .setOrigin(0, 1)),
      this.scene.add
        .text(x1, y - dy + textOffset, 'Deck', Style.todoHint)
        .setOrigin(0),
    ])

    // Removed
    this.container.add([
      this.scene.add.image(x, y - dy * 2, 'icon-Removed'),
      (this.txtRemoved = this.scene.add
        .text(x1, y - dy * 2 + textOffset, '4', Style.todoPileCount)
        .setOrigin(0, 1)),
      this.scene.add
        .text(x1, y - dy * 2 + textOffset, 'Removed', Style.todoHint)
        .setOrigin(0),
    ])
  }

  private createWins(): void {
    const x = Space.windowWidth - 250 + 136
    const x1 = x + 50
    const y = Space.windowHeight - 60 - 80
    const textOffset = 4

    this.container.add([
      this.scene.add.image(x, y, 'icon-Wins'),
      (this.txtWins = this.scene.add
        .text(x1, y + textOffset, '', Style.todoPileCount)
        .setOrigin(0, 1)),
      this.scene.add
        .text(x1, y + textOffset, 'Wins', Style.todoHint)
        .setOrigin(0),
    ])
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

  // TUTORIAL FUNCTIONALITY
  // Hide all elements in this region
  hideAll(): Region {
    this.txtWins.setVisible(false)
    this.txtBreath.setVisible(false)

    // Make all breath invisible
    ;[
      ...this.breathBasic,
      ...this.breathSpent,
      ...this.breathExtra,
      ...this.breathHover,
      ...this.breathOom,
    ].forEach((obj) => {
      obj.setVisible(false)
    })

    return this
  }

  showBackground(): Region {
    let bg = this.scene.add
      .image(
        Space.windowWidth,
        Space.windowHeight - 50 - Space.handHeight,
        'icon-Bottom Score',
      )
      .setOrigin(1, 0)
      .setInteractive()

    return this
  }

  // Show just the wins
  showWins(): Region {
    this.txtWins.setVisible(true)

    return this
  }

  // Show our Breath
  showBreath(): Region {
    this.txtBreath.setVisible(true)

    // Make the starting breath visible
    this.breathBasic[0].setVisible(true)
    this.breathSpent[0].setVisible(true)

    return this
  }
}
