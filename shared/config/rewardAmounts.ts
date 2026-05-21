const REWARD_AMOUNTS: { [key: string]: number } = {
  // Harvesting earns 50 - 80 gold
  harvestVariance: 31,
  harvestConstant: 50,

  // Each mission earns 100 gold
  missionComplete: 100,

  // Gem chance 10% 3-5
  gemChance: 0.1,
  gemAmount: 3,
  gemVariance: 2,
}

export default REWARD_AMOUNTS
