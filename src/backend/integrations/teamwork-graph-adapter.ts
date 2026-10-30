import api, { route } from "@forge/api";
import type { IntegrationProvider, HealthResult, Capability, ProviderResult, ProviderRequest } from "./provider";

export class TeamworkGraphAdapter implements IntegrationProvider {
  async connect() { return { success: true }; }
  async healthCheck(): Promise<HealthResult> {
    return { healthy: false, message: "Teamwork Graph availability depends on site configuration.", checkedAt: new Date().toISOString() };
  }
  async getCapabilities(): Promise<Capability[]> {
    return [{ name: "relationships", available: false }];
  }
  async fetchPage<T>(request: ProviderRequest): Promise<ProviderResult<T>> {
    return { data: {} as T, source: "teamwork-graph", retrievedAt: new Date().toISOString(), partial: true, warnings: ["Teamwork Graph not configured"] };
  }
  async execute() { return { success: false, message: "Not implemented" }; }
  async disconnect() { return; }
}