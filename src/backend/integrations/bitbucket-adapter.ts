import api, { route } from "@forge/api";
import type { IntegrationProvider, HealthResult, Capability, ProviderResult, ProviderRequest } from "./provider";

export interface BitbucketRepository {
  uuid: string;
  name: string;
  full_name: string;
  slug: string;
  workspace?: { slug?: string };
}

export interface BitbucketPullRequest {
  id: number;
  title: string;
  state: string;
  draft?: boolean;
  created_on?: string;
  updated_on?: string;
  author?: { display_name?: string };
  reviewers?: Array<{ display_name?: string; approved?: boolean }>;
  links?: { html?: { href?: string } };
}

export class BitbucketAdapter implements IntegrationProvider {
  async connect() { return { success: true }; }

  // Bitbucket is only reachable from a Forge app holding Bitbucket product
  // scopes (workspace-scoped). Site-scoped Jira/Confluence apps get
  // INVALID_REMOTE from the Forge proxy; surface that honestly.
  private static reason(res: { ok: boolean; status: number } | null, error?: unknown): string | null {
    if (error) {
      const msg = (error as Error).message ?? String(error);
      if (/INVALID_REMOTE/i.test(msg)) {
        return "Bitbucket needs a workspace-scoped app with repository scopes; this installation is site-scoped (Jira/Confluence).";
      }
      return `Bitbucket unavailable: ${msg}`;
    }
    if (res && !res.ok) return `HTTP ${res.status}`;
    return null;
  }

  async healthCheck(): Promise<HealthResult> {
    try {
      const res = await api.asApp().requestBitbucket(route`/2.0/repositories?pagelen=1&role=member`);
      const reason = BitbucketAdapter.reason(res);
      return { healthy: reason === null, message: reason ?? "OK", checkedAt: new Date().toISOString() };
    } catch (e) {
      return { healthy: false, message: BitbucketAdapter.reason(null, e) ?? "Bitbucket unavailable.", checkedAt: new Date().toISOString() };
    }
  }
  async getCapabilities(): Promise<Capability[]> {
    return [{ name: "pullRequests", available: true }, { name: "repositories", available: true }];
  }

  async fetchRepositories(limit = 10): Promise<BitbucketRepository[]> {
    const res = await api.asApp().requestBitbucket(route`/2.0/repositories?pagelen=${limit}&role=member`);
    if (!res.ok) return [];
    const body = (await res.json()) as { values?: BitbucketRepository[] };
    return Array.isArray(body.values) ? body.values : [];
  }

  async fetchPullRequests(repository: string, limit = 25): Promise<BitbucketPullRequest[]> {
    const res = await api.asApp().requestBitbucket(
      route`/2.0/repositories/${repository}/pullrequests?state=OPEN&pagelen=${limit}`
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { values?: BitbucketPullRequest[] };
    return Array.isArray(body.values) ? body.values : [];
  }

  async fetchPage<T>(request: ProviderRequest): Promise<ProviderResult<T>> {
    const limit = request.limit ?? 25;
    const res = await api.asApp().requestBitbucket(route`/2.0/repositories?pagelen=${limit}`);
    if (!res.ok) {
      return { data: {} as T, source: "bitbucket", retrievedAt: new Date().toISOString(), partial: true, warnings: [`HTTP ${res.status}`] };
    }
    const json = (await res.json()) as T;
    return { data: json, source: "bitbucket", retrievedAt: new Date().toISOString(), partial: false, warnings: [] };
  }
  async execute() { return { success: false, message: "Not implemented" }; }
  async disconnect() { return; }
}
