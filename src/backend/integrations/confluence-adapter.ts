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
      // v2 (/wiki/api/v2/*) requires granular scopes (read:page:confluence,
      // read:space:confluence) that this app does not hold, so it answers 401.
      // v1 /wiki/rest/api/space is sunset (410), but v1 /content still serves
      // under the classic read:confluence-content.all scope we already have.
      const res = await api.asApp().requestConfluence(route`/wiki/rest/api/content?limit=1`);
      return { healthy: res.ok, message: res.ok ? "OK" : `HTTP ${res.status}`, checkedAt: new Date().toISOString() };
    } catch (e) {
      return { healthy: false, message: (e as Error).message, checkedAt: new Date().toISOString() };
    }
  }
  async getCapabilities(): Promise<Capability[]> {
    return [{ name: "pages", available: true }, { name: "spaces", available: false }];
  }

  async fetchPages(limit = 25): Promise<ConfluencePage[]> {
    const res = await api.asApp().requestConfluence(
      route`/wiki/rest/api/content?type=page&limit=${limit}&expand=version`
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { results?: ConfluencePage[] };
    return Array.isArray(body.results) ? body.results : [];
  }

  async fetchPage<T>(request: ProviderRequest): Promise<ProviderResult<T>> {
    const limit = request.limit ?? 25;
    const res = await api.asApp().requestConfluence(route`/wiki/rest/api/content?limit=${limit}`);
    if (!res.ok) {
      return { data: {} as T, source: "confluence", retrievedAt: new Date().toISOString(), partial: true, warnings: [`HTTP ${res.status}`] };
    }
    const json = (await res.json()) as T;
    return { data: json, source: "confluence", retrievedAt: new Date().toISOString(), partial: false, warnings: [] };
  }
  async execute() { return { success: false, message: "Not implemented" }; }
  async disconnect() { return; }
}
