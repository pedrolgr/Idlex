import type {
  CharactersResponse,
  GameTicketResponse,
  HunteraAccount,
  HunteraClientOptions,
  LoginResponse,
} from "./types.js";

const DEFAULT_BASE_URL =
  process.env["HUNTERA_BASE_URL"] ?? "https://www.huntera.com.br";

export class HunteraError extends Error {
  public override readonly name = "HunteraError";
  public readonly status: number;
  public readonly body: unknown;

  constructor(message: string, status: number, body: unknown = null) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export class HunteraClient {
  public readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultTimeoutMs: number;
  private readonly cookies = new Map<string, string>();

  constructor({
    baseUrl = DEFAULT_BASE_URL,
    fetchImpl = fetch,
    defaultTimeoutMs = 10_000,
  }: HunteraClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetchImpl = fetchImpl;
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  async request<T = unknown>(
    path: string,
    options: RequestInit & { timeoutMs?: number } = {},
  ): Promise<T> {
    const { timeoutMs = this.defaultTimeoutMs, ...fetchOptions } = options;
    const headers = new Headers(fetchOptions.headers);

    if (fetchOptions.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    if (this.cookies.size > 0) {
      headers.set(
        "cookie",
        [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      );
    }

    const signal = fetchOptions.signal ?? AbortSignal.timeout(timeoutMs);

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...fetchOptions,
      headers,
      signal,
    });

    const setCookies =
      (response.headers as any).getSetCookie?.() ??
      [response.headers.get("set-cookie")].filter(Boolean);
    this.storeCookies(setCookies);

    const text = await response.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (!response.ok) {
      throw new HunteraError(
        body?.error ?? `HTTP ${response.status}`,
        response.status,
        body,
      );
    }

    return body as T;
  }

  storeCookies(setCookieHeaders: string[]): void {
    for (const header of setCookieHeaders) {
      if (!header) continue;
      const [pair] = header.split(";", 1);
      if (!pair) continue;
      const separator = pair.indexOf("=");
      if (separator > 0) {
        this.cookies.set(
          pair.slice(0, separator).trim(),
          pair.slice(separator + 1).trim(),
        );
      }
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async me(): Promise<{ account: HunteraAccount }> {
    return this.request<{ account: HunteraAccount }>("/api/auth/me");
  }

  async characters(): Promise<CharactersResponse> {
    return this.request<CharactersResponse>("/api/characters");
  }

  async gameTicket(characterId: number | string): Promise<GameTicketResponse> {
    return this.request<GameTicketResponse>("/api/game-tickets", {
      method: "POST",
      body: JSON.stringify({ characterId }),
    });
  }
}
