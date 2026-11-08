import api from "@forge/api";
import type { IntegrationProvider, HealthResult, Capability, ProviderResult, ProviderRequest } from "./provider";

// Teamwork Graph is exposed via api.asUser(accountId).requestTeamworkGraph.
// The accountId comes from the Forge invocation context; without it we
// degrade honestly instead of fabricating graph data.
const TWG_QUERY = `query ShipSignalWork { teamworkGraph { work { id title } } }`;

export class TeamworkGraphAdapter implements IntegrationProvider {
  constructor(private accountId?: string) {}

  async connect() { return { success: true }; }

  async healthCheck(): Promise<HealthResult> {
    if (!this.accountId) {
      return { healthy: false, message: "Teamwork Graph requires a user context (accountId unavailable).", checkedAt: new Date().toISOString() };
    }
    try {
      const res = await api.asUser(this.accountId).requestTeamworkGraph(TWG_QUERY);
      const body = (await res.json()) as { errors?: unknown[] };
      if (!res.ok || body.errors?.length) {
        return { healthy: false, message: res.ok ? "TWG GraphQL errors" : `HTTP ${res.status}`, checkedAt: new Date().toISOString() };
      }
      return { healthy: true, message: "OK", checkedAt: new Date().toISOString() };
    } catch (e) {
      return { healthy: false, message: (e as Error).message, checkedAt: new Date().toISOString() };
    }
  }

  async getCapabilities(): Promise<Capability[]> {
    return [{ name: "relationships", available: Boolean(this.accountId) }];
  }

  async fetchPage<T>(request: ProviderRequest): Promise<ProviderResult<T>> {
    if (!this.accountId) {
      return { data: {} as T, source: "teamwork-graph", retrievedAt: new Date().toISOString(), partial: true, warnings: ["Teamwork Graph requires user context"] };
    }
    try {
      const res = await api.asUser(this.accountId).requestTeamworkGraph(TWG_QUERY);
      const json = (await res.json()) as T;
      return { data: json, source: "teamwork-graph", retrievedAt: new Date().toISOString(), partial: !res.ok, warnings: res.ok ? [] : [`TWG HTTP ${res.status}`] };
    } catch (e) {
      return { data: {} as T, source: "teamwork-graph", retrievedAt: new Date().toISOString(), partial: true, warnings: [`Teamwork Graph unavailable: ${(e as Error).message}`] };
    }
  }

  async execute() { return { success: false, message: "Not implemented" }; }
  async disconnect() { return; }
}