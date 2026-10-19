const KEY = "mealq.registration.v1";

export function isRegistrationChallenge(value) {
  return value?.verificationRequired === true && typeof value.registrationId === "string" && /^[a-f0-9]{48}$/.test(value.registrationId)
    && typeof value.email === "string" && Number.isFinite(Date.parse(value.expiresAt)) && Number.isFinite(Date.parse(value.resendAfter));
}

export function loadRegistrationChallenge() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY));
    return isRegistrationChallenge(saved) ? saved : null;
  } catch { return null; }
}

export function saveRegistrationChallenge(value) {
  try {
    if (!value) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, JSON.stringify({ verificationRequired: true, registrationId: value.registrationId, email: value.email, expiresAt: value.expiresAt, resendAfter: value.resendAfter }));
  } catch { /* The current form also retains its challenge when storage is unavailable. */ }
}
