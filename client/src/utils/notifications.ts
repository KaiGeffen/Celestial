/** Whether the user still needs to be prompted for notification permission. */
export function shouldShowNotificationRequestButton(): boolean {
  return 'Notification' in window && Notification.permission === 'default'
}

/** Request permission to show match-found notifications. Call from a user gesture. */
export function requestMatchNotificationPermission(): Promise<
  NotificationPermission | undefined
> {
  if (!('Notification' in window)) return Promise.resolve(undefined)
  if (Notification.permission !== 'default') {
    return Promise.resolve(Notification.permission)
  }
  return Notification.requestPermission()
}

/** Notify the user that a match was found (e.g. tab in background while queued). */
export function notifyMatchFound(): void {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  if (document.visibilityState === 'visible') return

  const notification = new Notification('Opponent found', {
    body: 'Your match is starting.',
    tag: 'match-found',
  })

  notification.onclick = () => {
    window.focus()
    notification.close()
  }

  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'visible') {
        notification.close()
      }
    },
    { once: true },
  )
}
