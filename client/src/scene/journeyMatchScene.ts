import { MatchScene } from './matchScene'
import { ResultsRegionJourney } from './matchRegions/matchResults'

export default class JourneyMatchScene extends MatchScene {
  constructor(args = { key: 'JourneyMatchScene', lastScene: 'JourneyScene' }) {
    super(args)
  }

  create(params = {}): void {
    super.create(params)
    this.view.results = new ResultsRegionJourney().create(this)
  }

  restart(): void {
    super.restart()
    this.view.results = new ResultsRegionJourney().create(this)
  }
}
