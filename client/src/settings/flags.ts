var mobileCheck = require('is-mobile')

export const Flags = {
  // Running a local instance instead of on the server
  local: location.port === '4949',

  // Is client connected to the internet
  online: navigator.onLine,

  // Include cards still in development
  devCardsEnabled: new URLSearchParams(window.location.search).has('dev'),
  // || location.port === '4949',

  // See cards in the opponent's hand
  peek: new URLSearchParams(window.location.search).has('peek'),

  // If user is on a mobile device
  mobile: mobileCheck(),

  // Allow network toggle for debugging
  networkToggle: new URLSearchParams(window.location.search).has(
    'networkToggle',
  ),
}
