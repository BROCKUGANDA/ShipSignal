import api, { route } from "@forge/api";
import type { IntegrationProvider, HealthResult, Capability, ProviderResult, ProviderRequest } from "./provider";

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
  async fetchPage<T>(request: ProviderRequest): Promise<ProviderResult<T>> {
    const limit = request.limit ?? 25;
    const res = await api.asApp().requestConfluence(route`/wiki/rest/api/content?limit=${limit}`);
    const json = (await res.json()) as T;
    return { data: json, source: "confluence", retrievedAt: new Date().toISOString(), partial: !res.ok, warnings: res.ok ? [] : [`HTTP ${res.status}`] };
  }
  async execute() { return { success: false, message: "Not implemented" }; }
  async disconnect() { return; }
}