import api, { route } from "@forge/api";
import type { IntegrationProvider, HealthResult, Capability, ProviderResult, ProviderRequest } from "./provider";

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraVersion {
  id: string;
  name: string;
  description?: string;
  released?: boolean;
  releaseDate?: string;
  self?: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  self?: string;
  fields?: {
    summary?: string;
    updated?: string;
    status?: { name?: string };
    priority?: { name?: string };
    issuetype?: { name?: string };
  };
}

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
      { name: "versions", available: true },
      { name: "boards", available: true },
    ];
  }

  async fetchProjects(limit = 25): Promise<JiraProject[]> {
    const res = await api.asApp().requestJira(route`/rest/api/3/project/search?maxResults=${limit}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { values?: JiraProject[] };
    return json.values ?? [];
  }

  async fetchVersions(projectId: string): Promise<JiraVersion[]> {
    const res = await api.asApp().requestJira(route`/rest/api/3/project/${projectId}/versions`);
    if (!res.ok) return [];
    const json = (await res.json()) as JiraVersion[];
    return Array.isArray(json) ? json : [];
  }

  async fetchIssuesForVersion(versionName: string, limit = 50): Promise<JiraIssue[]> {
    const jql = encodeURIComponent(`fixVersion = "${versionName.replace(/"/g, '\\"')}" ORDER BY priority DESC`);
    const res = await api.asApp().requestJira(
      route`/rest/api/3/search?jql=${jql}&maxResults=${limit}&fields=summary,status,priority,issuetype,updated`
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { issues?: JiraIssue[] };
    return Array.isArray(json.issues) ? json.issues : [];
  }

  async fetchPage<T>(request: ProviderRequest): Promise<ProviderResult<T>> {
    const limit = request.limit ?? 25;
    const res = await api.asApp().requestJira(route`/rest/api/3/search?maxResults=${limit}&startAt=0`);
    if (!res.ok) {
      return { data: {} as T, source: "jira", retrievedAt: new Date().toISOString(), partial: true, warnings: [`HTTP ${res.status}`] };
    }
    const json = (await res.json()) as T;
    return {
      data: json,
      source: "jira",
      retrievedAt: new Date().toISOString(),
      partial: false,
      warnings: [],
    };
  }

  async execute(): Promise<{ success: boolean; id?: string; message?: string }> {
    return { success: false, message: "Not implemented" };
  }

  async disconnect(): Promise<void> {
    return;
  }
}