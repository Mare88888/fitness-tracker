const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function buildUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }
  return `${API_BASE_URL}${path}`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const prefix = `${name}=`;
  const cookies = document.cookie.split(";").map((item) => item.trim());
  const matched = cookies.find((cookie) => cookie.startsWith(prefix));
  return matched ? decodeURIComponent(matched.slice(prefix.length)) : null;
}

export async function ensureCsrfToken(): Promise<string> {
  const existing = readCookie("XSRF-TOKEN");
  if (existing) {
    return existing;
  }

  const response = await fetch(buildUrl("/auth/csrf"), {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to initialize CSRF token.");
  }

  const payload = (await response.json()) as { token?: string };
  const token = readCookie("XSRF-TOKEN");
  if (token) {
    return token;
  }
  if (payload.token) {
    return payload.token;
  }
  throw new Error("CSRF token cookie is missing.");
}
