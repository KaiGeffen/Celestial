import { UserSettings } from '../settings/settings'

// Ensure that music is playing if music isn't muted
export default function ensureMusic(scene: Phaser.Scene) {
  if (UserSettings._get('musicVolume') > 0) {
    let music: HTMLAudioElement = <HTMLAudioElement>(
      document.getElementById('music')
    )
    music.play()
    music.volume =
      (UserSettings._get('musicVolume') * UserSettings._get('volume')) / 4
  }
}
