import api from "@forge/api";
import type { IntegrationProvider, HealthResult, Capability, ProviderResult, ProviderRequest } from "./provider";

const COMPONENTS_QUERY = `query ShipSignalComponents($cloudId: String!, $query: CompassSearchComponentQuery) {
  compass {
    searchComponents(cloudId: $cloudId, query: $query) {
      ... on CompassSearchComponentConnection {
        nodes {
          component {
            id
            name
          }
        }
      }
      ... on QueryError {
        message
        extensions {
          statusCode
          errorType
        }
      }
    }
  }
}`;

interface GraphResponse {
  data?: {
    compass?: {
      searchComponents?: {
        nodes?: Array<{ component?: { id?: string; name?: string } | null }>;
        message?: string;
      };
    };
  };
  errors?: Array<{ message?: string }>;
}

export class CompassAdapter implements IntegrationProvider {
  private readonly cloudId?: string;

  constructor(cloudId?: string) {
    if (cloudId) this.cloudId = cloudId;
  }

  async connect() { return { success: true }; }

  private reason(body: GraphResponse | null, status?: number): string | null {
    if (!this.cloudId) {
      return "Compass requires a cloudId from the invocation context; none was available.";
    }
    if (status !== undefined && (status < 200 || status >= 300)) {
      return `Compass HTTP ${status}`;
    }
    const gql = body?.errors?.map((e) => e.message).filter(Boolean).join("; ");
    if (gql) return `Compass GraphQL error: ${gql}`;
    const queryError = body?.data?.compass?.searchComponents?.message;
    if (queryError) return `Compass query rejected: ${queryError}`;
    return null;
  }

  async healthCheck(): Promise<HealthResult> {
    if (!this.cloudId) {
      return {
        healthy: false,
        message: "Compass requires a cloudId from the invocation context; none was available.",
        checkedAt: new Date().toISOString(),
      };
    }
    try {
      const res = await api.asApp().requestGraph(COMPONENTS_QUERY, {
        cloudId: this.cloudId,
        query: { query: "" },
      });
      const body = (await res.json()) as GraphResponse;
      const reason = this.reason(body, res.status);
      return { healthy: reason === null, message: reason ?? "OK", checkedAt: new Date().toISOString() };
    } catch (e) {
      return { healthy: false, message: `Compass unavailable: ${(e as Error).message}`, checkedAt: new Date().toISOString() };
    }
  }
  async getCapabilities(): Promise<Capability[]> {
    return [{ name: "components", available: Boolean(this.cloudId) }, { name: "relationships", available: false }];
  }
  async fetchPage<T>(_request: ProviderRequest): Promise<ProviderResult<T>> {
    if (!this.cloudId) {
      return {
        data: {} as T,
        source: "compass",
        retrievedAt: new Date().toISOString(),
        partial: true,
        warnings: ["Compass requires a cloudId from the invocation context; none was available."],
      };
    }
    try {
      const res = await api.asApp().requestGraph(COMPONENTS_QUERY, {
        cloudId: this.cloudId,
        query: { query: "" },
      });
      const json = (await res.json()) as T;
      const reason = this.reason(json as GraphResponse, res.status);
      return {
        data: json,
        source: "compass",
        retrievedAt: new Date().toISOString(),
        partial: reason !== null,
        warnings: reason ? [reason] : [],
      };
    } catch (e) {
      return {
        data: {} as T,
        source: "compass",
        retrievedAt: new Date().toISOString(),
        partial: true,
        warnings: [`Compass unavailable: ${(e as Error).message}`],
      };
    }
  }
  async execute() { return { success: false, message: "Not implemented" }; }
  async disconnect() { return; }
}