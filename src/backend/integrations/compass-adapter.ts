import api from "@forge/api";
import type { IntegrationProvider, HealthResult, Capability, ProviderResult, ProviderRequest } from "./provider";

const COMPONENTS_QUERY = `query ShipSignalComponents($first: Int!) { components(first: $first) { nodes { id name } } }`;

export class CompassAdapter implements IntegrationProvider {
  async connect() { return { success: true }; }
  async healthCheck(): Promise<HealthResult> {
    try {
      const res = await api.asApp().requestGraph(COMPONENTS_QUERY, { first: 1 });
      const body = (await res.json()) as { errors?: unknown[] };
      if (!res.ok || body.errors?.length) {
        return { healthy: false, message: res.ok ? "GraphQL errors" : `HTTP ${res.status}`, checkedAt: new Date().toISOString() };
      }
      return { healthy: true, message: "OK", checkedAt: new Date().toISOString() };
    } catch (e) {
      return { healthy: false, message: (e as Error).message, checkedAt: new Date().toISOString() };
    }
  }
  async getCapabilities(): Promise<Capability[]> {
    return [{ name: "components", available: true }, { name: "relationships", available: false }];
  }
  async fetchPage<T>(request: ProviderRequest): Promise<ProviderResult<T>> {
    try {
      const res = await api.asApp().requestGraph(COMPONENTS_QUERY, { first: request.limit ?? 25 });
      const json = (await res.json()) as T;
      const warnings = res.ok ? [] : [`Compass HTTP ${res.status}`];
      return { data: json, source: "compass", retrievedAt: new Date().toISOString(), partial: !res.ok, warnings };
    } catch (e) {
      return { data: {} as T, source: "compass", retrievedAt: new Date().toISOString(), partial: true, warnings: [`Compass unavailable: ${(e as Error).message}`] };
    }
  }
  async execute() { return { success: false, message: "Not implemented" }; }
  async disconnect() { return; }
}