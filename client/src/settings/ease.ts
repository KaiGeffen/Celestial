// The easing of each tween
export const Ease: Record<string, string> = {
  basic: 'Quad.InOut',

  // Regions in the builder sliding around
  slide: 'Sine.Out',

  // Card moving between regions
  card: 'Linear',

  // Stillframes sliding down
  stillframe: 'Quad.InOut',
  // Stillframe sliding up as it ends
  stillframeEnd: 'Quad.Out',

  // Cards falling on the title scene
  cardFall: 'Quart.easeIn',

  // Water ripple growing outward from a click
  ripple: 'Sine.Out',
}
