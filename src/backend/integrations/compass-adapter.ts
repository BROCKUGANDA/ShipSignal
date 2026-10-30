import api from "@forge/api";
import type { IntegrationProvider, HealthResult, Capability, ProviderResult, ProviderRequest } from "./provider";

export class CompassAdapter implements IntegrationProvider {
  async connect() { return { success: true }; }
  async healthCheck(): Promise<HealthResult> {
    const fn = (api.asApp() as { requestCompass?: (r: unknown) => Promise<Response> }).requestCompass;
    if (typeof fn !== "function") {
      return { healthy: false, message: "Compass API not available in this runtime.", checkedAt: new Date().toISOString() };
    }
    try {
      const res = await fn("/graphql");
      return { healthy: res.ok, message: res.ok ? "OK" : `HTTP ${res.status}`, checkedAt: new Date().toISOString() };
    } catch (e) {
      return { healthy: false, message: (e as Error).message, checkedAt: new Date().toISOString() };
    }
  }
  async getCapabilities(): Promise<Capability[]> {
    return [{ name: "components", available: false }, { name: "relationships", available: false }];
  }
  async fetchPage<T>(request: ProviderRequest): Promise<ProviderResult<T>> {
    return { data: {} as T, source: "compass", retrievedAt: new Date().toISOString(), partial: true, warnings: ["Compass not available"] };
  }
  async execute() { return { success: false, message: "Not implemented" }; }
  async disconnect() { return; }
}