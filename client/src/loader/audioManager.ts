import { UserSettings } from '../settings/settings'

// Ensure that music is playing if music isn't muted. Browsers block audio
// autoplay without a prior user gesture (e.g. Google's auto-select sign-in
// can reach here before any click), so if play() is blocked, retry on the
// page's next interaction instead of staying silent until the user happens
// to open the options menu (which plays it as a side effect of its own click).
export default function ensureMusic(scene: Phaser.Scene) {
  if (UserSettings._get('musicVolume') > 0) {
    let music: HTMLAudioElement = <HTMLAudioElement>(
      document.getElementById('music')
    )
    music.volume =
      (UserSettings._get('musicVolume') * UserSettings._get('volume')) / 2

    music.play().catch(() => {
      const retry = () => {
        window.removeEventListener('pointerdown', retry)
        window.removeEventListener('keydown', retry)
        music.play().catch(() => {})
      }
      window.addEventListener('pointerdown', retry, { once: true })
      window.addEventListener('keydown', retry, { once: true })
    })
  }
}
