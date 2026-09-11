const STORAGE_KEY = "math_assistant_profile_info";

export interface ProfileInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  parentPhone: string;
  parentEmail: string;
}

const DEFAULT_INFO: ProfileInfo = {
  name: "",
  email: "",
  phone: "",
  location: "",
  parentPhone: "",
  parentEmail: "",
};

export function getProfileInfo(): ProfileInfo {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_INFO };
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      location: typeof parsed.location === "string" ? parsed.location : "",
      parentPhone: typeof parsed.parentPhone === "string" ? parsed.parentPhone : "",
      parentEmail: typeof parsed.parentEmail === "string" ? parsed.parentEmail : "",
    };
  } catch {
    return { ...DEFAULT_INFO };
  }
}

export function saveProfileInfo(info: ProfileInfo): ProfileInfo {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  } catch {
    // Ignore write failures (private browsing, storage disabled, etc.) — the
    // in-memory app state still reflects the update for this session.
  }
  return info;
}
