const STORAGE_KEY = "math_assistant_credentials";

export interface Credentials {
  username: string;
  password: string;
}

export function getStoredCredentials(): Credentials | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.username === "string" && typeof parsed.password === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredCredentials(credentials: Credentials): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

export function clearStoredCredentials(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
