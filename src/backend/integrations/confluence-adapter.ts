import api, { route } from "@forge/api";
import type { IntegrationProvider, HealthResult, Capability, ProviderResult, ProviderRequest } from "./provider";

export interface ConfluencePage {
  id: string;
  title: string;
  // v2 shape: version.createdAt / version.number (v1 used version.when)
  version?: { when?: string; createdAt?: string; number?: number };
  _links?: { webui?: string; base?: string };
}

const PAGE_FIELDS = "id,title,version,history.lastUpdated,_links";

export class ConfluenceAdapter implements IntegrationProvider {
  async connect() { return { success: true }; }
  async healthCheck(): Promise<HealthResult> {
    try {
      // Confluence Cloud REST v1 space/content endpoints are sunset (410 Gone).
      // v2 lives under /wiki/api/v2/.
      const res = await api.asApp().requestConfluence(route`/wiki/api/v2/spaces?limit=1`);
      return { healthy: res.ok, message: res.ok ? "OK" : `HTTP ${res.status}`, checkedAt: new Date().toISOString() };
    } catch (e) {
      return { healthy: false, message: (e as Error).message, checkedAt: new Date().toISOString() };
    }
  }
  async getCapabilities(): Promise<Capability[]> {
    return [{ name: "pages", available: true }, { name: "spaces", available: true }];
  }

  async fetchPages(limit = 25): Promise<ConfluencePage[]> {
    const res = await api.asApp().requestConfluence(route`/wiki/api/v2/pages?limit=${limit}&body-format=storage`);
    if (!res.ok) return [];
    const body = (await res.json()) as { results?: ConfluencePage[] };
    return Array.isArray(body.results) ? body.results : [];
  }

  async fetchPage<T>(request: ProviderRequest): Promise<ProviderResult<T>> {
    const limit = request.limit ?? 25;
    const res = await api.asApp().requestConfluence(route`/wiki/api/v2/pages?limit=${limit}`);
    if (!res.ok) {
      return { data: {} as T, source: "confluence", retrievedAt: new Date().toISOString(), partial: true, warnings: [`HTTP ${res.status}`] };
    }
    const json = (await res.json()) as T;
    return { data: json, source: "confluence", retrievedAt: new Date().toISOString(), partial: false, warnings: [] };
  }
  async execute() { return { success: false, message: "Not implemented" }; }
  async disconnect() { return; }
}
