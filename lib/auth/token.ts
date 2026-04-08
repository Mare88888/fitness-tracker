const AUTH_TOKEN_KEY = "fitness_auth_token";
const AUTH_USERNAME_KEY = "fitness_auth_username";
const AUTH_CHANGED_EVENT = "fitness-auth-changed";

function emitAuthChangedEvent(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  emitAuthChangedEvent();
}

export function getAuthUsername(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(AUTH_USERNAME_KEY);
}

export function setAuthUsername(username: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(AUTH_USERNAME_KEY, username);
  emitAuthChangedEvent();
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USERNAME_KEY);
  emitAuthChangedEvent();
}
