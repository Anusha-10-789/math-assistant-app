const STORAGE_KEY = "math_assistant_credentials";
// Kept even after logging out, so the login form is pre-filled next time.
const REMEMBERED_USERNAME_KEY = "math_assistant_remembered_username";
const REMEMBER_ME_KEY = "math_assistant_remember_me";

export interface Credentials {
  username: string;
  password: string;
}

// Browser storage can be unavailable (private windows, blocked site data),
// so every access is wrapped — the app then just behaves as "not remembered".
function read(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function write(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // ignore — see read()
  }
}

function remove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // ignore — see read()
  }
}

function parseCredentials(raw: string | null): Credentials | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.username === "string" && typeof parsed.password === "string") {
      return parsed;
    }
  } catch {
    // fall through
  }
  return null;
}

// "Remember me" logins live in localStorage (kept across browser restarts);
// others in sessionStorage (gone when the tab closes).
export function getStoredCredentials(): Credentials | null {
  return (
    parseCredentials(read(sessionStorage, STORAGE_KEY)) ?? parseCredentials(read(localStorage, STORAGE_KEY))
  );
}

export function setStoredCredentials(credentials: Credentials, remember = getRememberMe()): void {
  const raw = JSON.stringify(credentials);
  if (remember) {
    write(localStorage, STORAGE_KEY, raw);
    remove(sessionStorage, STORAGE_KEY);
  } else {
    write(sessionStorage, STORAGE_KEY, raw);
    remove(localStorage, STORAGE_KEY);
  }
  write(localStorage, REMEMBER_ME_KEY, remember ? "true" : "false");
  write(localStorage, REMEMBERED_USERNAME_KEY, credentials.username);
}

export function clearStoredCredentials(): void {
  remove(sessionStorage, STORAGE_KEY);
  remove(localStorage, STORAGE_KEY);
}

export function getRememberedUsername(): string {
  return read(localStorage, REMEMBERED_USERNAME_KEY) ?? "";
}

export function getRememberMe(): boolean {
  return read(localStorage, REMEMBER_ME_KEY) === "true";
}
