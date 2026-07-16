export const Flags = {
  // Running a local instance instead of on the server
  local: location.port === '4949',

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
