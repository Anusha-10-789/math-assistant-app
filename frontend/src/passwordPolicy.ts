// Mirrors backend/password_policy.py — kept in sync so the error surfaces
// instantly client-side instead of only after a round-trip to the server.
export const PASSWORD_REQUIREMENTS_TEXT =
  "At least 8 characters, with one uppercase letter, one number, and one special character.";

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return PASSWORD_REQUIREMENTS_TEXT;
  if (!/[A-Z]/.test(password)) return PASSWORD_REQUIREMENTS_TEXT;
  if (!/[0-9]/.test(password)) return PASSWORD_REQUIREMENTS_TEXT;
  if (!/[^A-Za-z0-9]/.test(password)) return PASSWORD_REQUIREMENTS_TEXT;
  return null;
}
