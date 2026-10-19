/** Settings remounts must observe the result of an already-running device/save action. */
export function createSettingsOperationQueue() {
  let tail = Promise.resolve();
  return {
    run(operation) {
      const request = tail.then(operation);
      tail = request.then(() => undefined, () => undefined);
      return request;
    },
  };
}

export function createSettingsScope() {
  let active = true;
  return { isCurrent: () => active, dispose() { active = false; } };
}

// Start permission immediately in the click handler, before any queued async work.
// Rejections are captured immediately while a prior operation may still be running.
export function pushPermissionFromGesture(browser = globalThis) {
  try {
    const permission = browser.Notification?.permission === "granted"
      ? "granted" : browser.Notification.requestPermission();
    return Promise.resolve(permission).then((value) => ({ permission: value }), (error) => ({ error }));
  } catch (error) { return Promise.resolve({ error }); }
}

// A browser subscription belongs to the origin, so both account portals share this queue.
export const pushSettingsOperations = createSettingsOperationQueue();
export const emailSettingsOperations = createSettingsOperationQueue();
