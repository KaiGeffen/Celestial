// TODO Confusing for this to be just the data that goes over ws and for a separate type to contain the full data

// Data about an achievement
export interface Achievement {
  achievement_id: number
  progress: number
  seen: boolean
}
