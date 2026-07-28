// Injected by webpack DefinePlugin; 'staging' for `npm run build:staging`,
// 'production' otherwise (including plain dev builds).
declare const __DEPLOY_ENV__: string

export const Flags = {
  // Running a local instance instead of on the server
  local: location.port === '4949',

  // Built via `npm run build:staging`, pointed at staging.celestialdecks.gg
  // instead of the production domain
  staging:
    typeof __DEPLOY_ENV__ !== 'undefined' && __DEPLOY_ENV__ === 'staging',

  // Is client connected to the internet
  online: navigator.onLine,

  // Include cards still in development
  devCardsEnabled:
    new URLSearchParams(window.location.search).has('dev') ||
    location.port === '4949',

  // Allow network toggle for debugging
  networkToggle: new URLSearchParams(window.location.search).has(
    'networkToggle',
  ),

  // Whether this client is running in the Electron build
  isElectronBuild: () => typeof window.electronAPI !== 'undefined',
}
