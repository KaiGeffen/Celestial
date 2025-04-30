import 'phaser'
import Cutout from '../../lib/buttons/cutout'
import { Color, Space, Time } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'

const width = 700

export default class DistributionMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene, width)

    const costs = this.getCosts(params.currentDeck)

    let panel = scene.rexUI.add.fixWidthSizer({
      x: Space.windowWidth / 2,
      y: Space.windowHeight / 2,
      align: 'center',
      space: {
        bottom: Space.pad,
        line: Space.pad,
      },
    })

    // Add background
    let rect = scene.rexUI.add
      .roundRectangle(0, 0, 0, 0, Space.corner, Color.backgroundDark, 1)
      .setInteractive()
    panel.addBackground(rect)

    // Header
    panel.add(this.createHeader('Breath Cost Distribution', width)).addNewLine()

    // Chart
    panel.add(this.createChart(costs))

    panel.layout()
  }

  private getCosts(deck: Cutout[]): number[] {
    let result = Array(10).fill(0)

    deck.forEach((cutout) => {
      const card = cutout.card
      result[card.cost] += cutout.count
    })

    return result
  }

  private createChart(costs: number[]): any {
    const chartWidth = width - Space.pad * 2

    // NOTE Necessary because type definition has wrong list of parameters for chart
    const factory: any = this.scene.rexUI.add

    return factory.chart(
      Space.windowWidth / 2,
      Space.windowHeight / 2,
      chartWidth,
      (chartWidth * 2) / 3,
      {
        type: 'bar',
        data: {
          labels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
          datasets: [
            {
              label: 'Costs',
              backgroundColor: Color.bar,
              borderWidth: 3,
              borderColor: Color.barBorder,
              data: costs,
            },
          ],
        },
        options: {
          animation: {
            duration: Time.chart,
            easing: 'easeOutQuint',
          },
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: {
              ticks: {
                stepSize: 1,
              },
              beginAtZero: true,
            },
          },
        },
      },
    )
  }
}
