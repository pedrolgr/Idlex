const BASE_URL = process.env.HUNTERA_BASE_URL ?? "https://www.huntera.com.br";

export class HunteraError extends Error {
  constructor(message, status, body = null) {
    super(message);
    this.name = "HunteraError";
    this.status = status;
    this.body = body;
  }
}

export class HunteraClient {
  constructor({ baseUrl = BASE_URL, fetchImpl = fetch } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetchImpl = fetchImpl;
    this.cookies = new Map();
  }

  async request(path, options = {}) {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    if (this.cookies.size > 0) {
      headers.set("cookie", [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; "));
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });
    this.storeCookies(response.headers.getSetCookie?.() ?? []);

    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!response.ok) {
      throw new HunteraError(body?.error ?? `HTTP ${response.status}`, response.status, body);
    }
    return body;
  }

  storeCookies(setCookieHeaders) {
    for (const header of setCookieHeaders) {
      const [pair] = header.split(";", 1);
      const separator = pair.indexOf("=");
      if (separator > 0) this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  }

  async login(email, password) {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async me() {
    return this.request("/api/auth/me");
  }

  async characters() {
    return this.request("/api/characters");
  }

  async gameTicket(characterId) {
    return this.request("/api/game-tickets", {
      method: "POST",
      body: JSON.stringify({ characterId }),
    });
  }
}
