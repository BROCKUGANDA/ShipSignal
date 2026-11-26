import api, { route } from "@forge/api";
import type { IntegrationProvider, HealthResult, Capability, ProviderResult, ProviderRequest } from "./provider";

export interface ConfluencePage {
  id: string;
  title: string;
  version?: { when?: string; number?: number };
  _links?: { webui?: string; base?: string };
}

const PAGE_FIELDS = "id,title,version,history.lastUpdated,_links";

export class ConfluenceAdapter implements IntegrationProvider {
  async connect() { return { success: true }; }
  async healthCheck(): Promise<HealthResult> {
    try {
      const res = await api.asApp().requestConfluence(route`/wiki/rest/api/space?limit=1`);
      return { healthy: res.ok, message: res.ok ? "OK" : `HTTP ${res.status}`, checkedAt: new Date().toISOString() };
    } catch (e) {
      return { healthy: false, message: (e as Error).message, checkedAt: new Date().toISOString() };
    }
  }
  async getCapabilities(): Promise<Capability[]> {
    return [{ name: "pages", available: true }, { name: "spaces", available: true }];
  }

  async fetchPages(limit = 25): Promise<ConfluencePage[]> {
    const res = await api.asApp().requestConfluence(
      route`/wiki/rest/api/content?type=page&limit=${limit}&expand=version,history.lastUpdated&_=${Date.now()}`
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { results?: ConfluencePage[] };
    return Array.isArray(body.results) ? body.results : [];
  }

  async fetchPage<T>(request: ProviderRequest): Promise<ProviderResult<T>> {
    const limit = request.limit ?? 25;
    const res = await api.asApp().requestConfluence(route`/wiki/rest/api/content?limit=${limit}&expand=${PAGE_FIELDS}`);
    if (!res.ok) {
      return { data: {} as T, source: "confluence", retrievedAt: new Date().toISOString(), partial: true, warnings: [`HTTP ${res.status}`] };
    }
    const json = (await res.json()) as T;
    return { data: json, source: "confluence", retrievedAt: new Date().toISOString(), partial: false, warnings: [] };
  }
  async execute() { return { success: false, message: "Not implemented" }; }
  async disconnect() { return; }
}
