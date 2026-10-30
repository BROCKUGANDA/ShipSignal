import api, { route } from "@forge/api";
import type { IntegrationProvider, HealthResult, Capability, ProviderResult, ProviderRequest } from "./provider";

export class BitbucketAdapter implements IntegrationProvider {
  async connect() { return { success: true }; }
  async healthCheck(): Promise<HealthResult> {
    try {
      const res = await api.asApp().requestBitbucket(route`/2.0/user`);
      return { healthy: res.ok, message: res.ok ? "OK" : `HTTP ${res.status}`, checkedAt: new Date().toISOString() };
    } catch (e) {
      return { healthy: false, message: (e as Error).message, checkedAt: new Date().toISOString() };
    }
  }
  async getCapabilities(): Promise<Capability[]> {
    return [{ name: "pullRequests", available: true }, { name: "commits", available: true }];
  }
  async fetchPage<T>(request: ProviderRequest): Promise<ProviderResult<T>> {
    const limit = request.limit ?? 25;
    const res = await api.asApp().requestBitbucket(route`/2.0/repositories?pagelen=${limit}`);
    const json = (await res.json()) as T;
    return { data: json, source: "bitbucket", retrievedAt: new Date().toISOString(), partial: !res.ok, warnings: res.ok ? [] : [`HTTP ${res.status}`] };
  }
  async execute() { return { success: false, message: "Not implemented" }; }
  async disconnect() { return; }
}