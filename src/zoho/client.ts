import { z } from "zod";

const envSchema = z.object({
  ZOHO_CLIENT_ID: z.string().min(1),
  ZOHO_CLIENT_SECRET: z.string().min(1),
  ZOHO_REFRESH_TOKEN: z.string().min(1),
  ZOHO_ACCOUNTS_HOST: z.string().url().default("https://accounts.zoho.eu"),
  ZOHO_API_HOST: z.string().url().default("https://www.zohoapis.eu"),
});

export type ZohoEnv = z.infer<typeof envSchema>;

export function loadZohoEnv(env: NodeJS.ProcessEnv = process.env): ZohoEnv {
  return envSchema.parse({
    ZOHO_CLIENT_ID: env.ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET: env.ZOHO_CLIENT_SECRET,
    ZOHO_REFRESH_TOKEN: env.ZOHO_REFRESH_TOKEN,
    ZOHO_ACCOUNTS_HOST: env.ZOHO_ACCOUNTS_HOST,
    ZOHO_API_HOST: env.ZOHO_API_HOST,
  });
}

type CachedToken = { value: string; expiresAt: number };

export class ZohoClient {
  private token: CachedToken | null = null;

  constructor(private readonly env: ZohoEnv = loadZohoEnv()) {}

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.token && this.token.expiresAt - 30_000 > now) {
      return this.token.value;
    }

    const url = new URL("/oauth/v2/token", this.env.ZOHO_ACCOUNTS_HOST);
    url.searchParams.set("refresh_token", this.env.ZOHO_REFRESH_TOKEN);
    url.searchParams.set("client_id", this.env.ZOHO_CLIENT_ID);
    url.searchParams.set("client_secret", this.env.ZOHO_CLIENT_SECRET);
    url.searchParams.set("grant_type", "refresh_token");

    const res = await fetch(url, { method: "POST" });
    if (!res.ok) {
      throw new Error(`Zoho token refresh failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
    };
    if (!data.access_token) {
      throw new Error(`Zoho token refresh missing access_token: ${JSON.stringify(data)}`);
    }
    this.token = {
      value: data.access_token,
      expiresAt: now + (data.expires_in ?? 3600) * 1000,
    };
    return this.token.value;
  }

  async request<T = unknown>(
    path: string,
    init: RequestInit & { query?: Record<string, string | number | boolean | undefined> } = {},
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = new URL(path.startsWith("http") ? path : `/crm/v8${path}`, this.env.ZOHO_API_HOST);
    if (init.query) {
      for (const [k, v] of Object.entries(init.query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Zoho-oauthtoken ${token}`);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const res = await fetch(url, { ...init, headers });
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const json = text ? (JSON.parse(text) as unknown) : undefined;
    if (!res.ok) {
      throw new ZohoApiError(res.status, json ?? text, url.toString());
    }
    return json as T;
  }
}

export class ZohoApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    public readonly url: string,
  ) {
    super(`Zoho API ${status} for ${url}: ${JSON.stringify(body)}`);
    this.name = "ZohoApiError";
  }
}
