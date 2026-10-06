export function getAuthToken(): string | null {
  try {
    return localStorage.getItem("idlex_token");
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem("idlex_token", token);
    } else {
      localStorage.removeItem("idlex_token");
    }
  } catch {
    // Ignore storage errors (private browsing, etc.)
  }
}

export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}
