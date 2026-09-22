// Client-side password feedback for UX only. The server must enforce the same policy.

export const MIN_PASSWORD_LENGTH = 8;

export function checkPassword(password) {
  return [
    { id: "length", passed: password.length >= MIN_PASSWORD_LENGTH },
    { id: "letter", passed: /\p{L}/u.test(password) },
    { id: "digit", passed: /\d/.test(password) },
    { id: "symbol", passed: /[^\p{L}\d\s]/u.test(password) },
  ];
}

/** Required: length, letter and digit. A symbol only raises the strength score. */
export function meetsPasswordPolicy(password) {
  return checkPassword(password)
    .filter((check) => check.id !== "symbol")
    .every((check) => check.passed);
}
