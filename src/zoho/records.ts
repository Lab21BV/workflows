import type { ZohoClient } from "./client";
import type { ModuleKey } from "./modules";

export type ZohoRecord = Record<string, unknown> & { id: string };

export interface ListRecordsOptions {
  fields?: string[];
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  cvid?: string;
}

export interface SearchOptions {
  criteria?: string;
  email?: string;
  phone?: string;
  word?: string;
  page?: number;
  perPage?: number;
}

interface ListResponse<T> {
  data: T[];
  info?: { count?: number; more_records?: boolean; page?: number; per_page?: number };
}

export class RecordsApi {
  constructor(private readonly client: ZohoClient) {}

  async list<T extends ZohoRecord = ZohoRecord>(
    module: ModuleKey,
    opts: ListRecordsOptions = {},
  ): Promise<ListResponse<T>> {
    return this.client.request<ListResponse<T>>(`/${module}`, {
      query: {
        fields: opts.fields?.join(","),
        page: opts.page,
        per_page: opts.perPage,
        sort_by: opts.sortBy,
        sort_order: opts.sortOrder,
        cvid: opts.cvid,
      },
    });
  }

  async get<T extends ZohoRecord = ZohoRecord>(module: ModuleKey, id: string): Promise<T | null> {
    const res = await this.client.request<ListResponse<T>>(`/${module}/${id}`);
    return res.data?.[0] ?? null;
  }

  async search<T extends ZohoRecord = ZohoRecord>(
    module: ModuleKey,
    opts: SearchOptions,
  ): Promise<ListResponse<T>> {
    return this.client.request<ListResponse<T>>(`/${module}/search`, {
      query: {
        criteria: opts.criteria,
        email: opts.email,
        phone: opts.phone,
        word: opts.word,
        page: opts.page,
        per_page: opts.perPage,
      },
    });
  }

  async create<T extends Record<string, unknown>>(
    module: ModuleKey,
    records: T[],
    trigger: ("workflow" | "approval" | "blueprint")[] = [],
  ): Promise<{ data: { code: string; status: string; details: { id: string } }[] }> {
    return this.client.request(`/${module}`, {
      method: "POST",
      body: JSON.stringify({ data: records, trigger }),
    });
  }

  async update<T extends Record<string, unknown>>(
    module: ModuleKey,
    records: (T & { id: string })[],
    trigger: ("workflow" | "approval" | "blueprint")[] = [],
  ): Promise<{ data: { code: string; status: string; details: { id: string } }[] }> {
    return this.client.request(`/${module}`, {
      method: "PUT",
      body: JSON.stringify({ data: records, trigger }),
    });
  }

  async delete(module: ModuleKey, ids: string[]): Promise<unknown> {
    return this.client.request(`/${module}`, {
      method: "DELETE",
      query: { ids: ids.join(",") },
    });
  }
}
