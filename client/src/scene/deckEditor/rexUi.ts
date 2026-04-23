import BaseScene from '../baseScene'

/** Rex UI plugin on scenes is not fully typed on `BaseScene`; use this at layout boundaries. */
export function rexUi(scene: BaseScene): any {
  return (scene as any).rexUI
}
