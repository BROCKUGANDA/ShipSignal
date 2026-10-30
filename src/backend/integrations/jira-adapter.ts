import api, { route } from "@forge/api";
import type { IntegrationProvider, HealthResult, Capability, ProviderResult, ProviderRequest } from "./provider";

export class JiraAdapter implements IntegrationProvider {
  async connect(): Promise<{ success: boolean; message?: string }> {
    return { success: true };
  }

  async healthCheck(): Promise<HealthResult> {
    try {
      const res = await api.asApp().requestJira(route`/rest/api/3/myself`);
      return { healthy: res.ok, message: res.ok ? "OK" : `HTTP ${res.status}`, checkedAt: new Date().toISOString() };
    } catch (e) {
      return { healthy: false, message: (e as Error).message, checkedAt: new Date().toISOString() };
    }
  }

  async getCapabilities(): Promise<Capability[]> {
    return [
      { name: "issues", available: true },
      { name: "projects", available: true },
      { name: "boards", available: true },
    ];
  }

  async fetchPage<T>(request: ProviderRequest): Promise<ProviderResult<T>> {
    const limit = request.limit ?? 25;
    const res = await api.asApp().requestJira(route`/rest/api/3/search?maxResults=${limit}&startAt=0`);
    const json = (await res.json()) as T;
    return {
      data: json,
      source: "jira",
      retrievedAt: new Date().toISOString(),
      partial: !res.ok,
      warnings: res.ok ? [] : [`HTTP ${res.status}`],
    };
  }

  async execute(): Promise<{ success: boolean; id?: string; message?: string }> {
    return { success: false, message: "Not implemented" };
  }

  async disconnect(): Promise<void> {
    return;
  }
}