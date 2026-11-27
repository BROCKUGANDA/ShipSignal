import api, { route } from "@forge/api";
import type { IntegrationProvider, HealthResult, Capability, ProviderResult, ProviderRequest } from "./provider";

// Teamwork Graph consumption uses the supported curated queries, not raw Cypher.
// Scopes are per object type and must be granted by an organization admin.
const OPERATION = "shipsignal_userWork";
const QUERY = `query shipsignal_userWork($userId: ID!, $first: Int!) {
  atlassianUserAssignedJiraWorkItems(userId: $userId, first: $first) {
    edges {
      node {
        ... on JiraWorkItem {
          id
          key
          summary
          resolvedAt
          dueAt
          webUrl
          issueType { name }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
  atlassianUserPullRequests(userId: $userId, first: $first) {
    edges {
      node {
        ... on ExternalPullRequest {
          id
          title
          displayId
          status
          url
          lastUpdatedAt
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

export interface TeamworkGraphWorkItem {
  id: string;
  key?: string;
  summary?: string;
  resolvedAt?: string;
  dueAt?: string;
  webUrl?: string;
  issueType?: string;
}

export interface TeamworkGraphPullRequest {
  id: string;
  title?: string;
  displayId?: string;
  status?: string;
  url?: string;
  lastUpdatedAt?: string;
}

export interface TeamworkGraphSnapshot {
  accountId: string;
  userId: string;
  workItems: TeamworkGraphWorkItem[];
  pullRequests: TeamworkGraphPullRequest[];
  checkedAt: string;
}

export const teamworkGraphUserId = (accountId: string): string =>
  accountId.startsWith("ari:") ? accountId : `ari:cloud:identity::user/${accountId}`;

type Edge<T> = { node?: T | null } | null | undefined;
type Connection<T> = { edges?: Edge<T>[] | null } | null | undefined;

type GraphPayload = {
  data?: {
    atlassianUserAssignedJiraWorkItems?: Connection<{
      id?: string;
      key?: string;
      summary?: string;
      resolvedAt?: string;
      dueAt?: string;
      webUrl?: string;
      issueType?: { name?: string } | null;
    }>;
    atlassianUserPullRequests?: Connection<{
      id?: string;
      title?: string;
      displayId?: string;
      status?: string;
      url?: string;
      lastUpdatedAt?: string;
    }>;
  } | null;
  errors?: Array<{ message?: string; extensions?: { classification?: string } }> | null;
};

export function mapTeamworkGraphSnapshot(payload: GraphPayload, accountId: string): TeamworkGraphSnapshot {
  const workItems = (payload.data?.atlassianUserAssignedJiraWorkItems?.edges ?? [])
    .map((edge) => edge?.node)
    .filter((node): node is NonNullable<typeof node> => Boolean(node?.id))
    .map((node) => ({
      id: String(node.id),
      ...(node.key ? { key: node.key } : {}),
      ...(node.summary ? { summary: node.summary } : {}),
      ...(node.resolvedAt ? { resolvedAt: node.resolvedAt } : {}),
      ...(node.dueAt ? { dueAt: node.dueAt } : {}),
      ...(node.webUrl ? { webUrl: node.webUrl } : {}),
      ...(node.issueType?.name ? { issueType: node.issueType.name } : {}),
    }));

  const pullRequests = (payload.data?.atlassianUserPullRequests?.edges ?? [])
    .map((edge) => edge?.node)
    .filter((node): node is NonNullable<typeof node> => Boolean(node?.id))
    .map((node) => ({
      id: String(node.id),
      ...(node.title ? { title: node.title } : {}),
      ...(node.displayId ? { displayId: node.displayId } : {}),
      ...(node.status ? { status: node.status } : {}),
      ...(node.url ? { url: node.url } : {}),
      ...(node.lastUpdatedAt ? { lastUpdatedAt: node.lastUpdatedAt } : {}),
    }));

  return {
    accountId,
    userId: teamworkGraphUserId(accountId),
    workItems,
    pullRequests,
    checkedAt: new Date().toISOString(),
  };
}

function graphError(payload: GraphPayload): string | undefined {
  const error = payload.errors?.[0];
  if (!error) return undefined;
  const classification = error.extensions?.classification;
  return `${classification ? `${classification}: ` : ""}${error.message ?? "Teamwork Graph query failed"}`;
}

export class TeamworkGraphAdapter implements IntegrationProvider {
  constructor(private accountId?: string) {}

  async connect() { return { success: true }; }

  async inspect(limit = 25): Promise<TeamworkGraphSnapshot> {
    if (!this.accountId) throw new Error("Teamwork Graph requires a user context (accountId unavailable).");
    const first = Math.max(1, Math.min(limit, 50));
    try {
      const res = await api.asUser(this.accountId).requestTeamworkGraph(
        QUERY,
        { userId: teamworkGraphUserId(this.accountId), first },
        OPERATION
      );
      const payload = (await res.json()) as GraphPayload;
      const error = graphError(payload);
      if (!res.ok || error) throw new Error(this.explainError(error ?? `Teamwork Graph HTTP ${res.status}`));
      return mapTeamworkGraphSnapshot(payload, this.accountId);
    } catch (error) {
      // Graph scopes need org-admin consent. The same "what is this person
      // working on" signal is available from Jira under read:jira-work, which
      // this app already holds, so degrade to that instead of showing nothing.
      const fallback = await this.jiraAssignedWork(first).catch(() => null);
      if (fallback) return fallback;
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Jira-backed equivalent of the graph's assigned work, used when the
   * read:graph:* scopes have not been consented. Works with read:jira-work.
   */
  private async jiraAssignedWork(limit: number): Promise<TeamworkGraphSnapshot | null> {
    if (!this.accountId) return null;
    const jql = encodeURIComponent("assignee = currentUser() ORDER BY updated DESC");
    const res = await api.asUser(this.accountId).requestJira(
      route`/rest/api/3/search/jql?jql=${jql}&maxResults=${limit}&fields=summary,status,priority,issuetype,updated`
    );
    if (!res.ok) return null;
    const payload = (await res.json()) as {
      issues?: Array<{
        id?: string;
        key?: string;
        self?: string;
        fields?: {
          summary?: string;
          updated?: string;
          status?: { name?: string };
          issuetype?: { name?: string };
        };
      }>;
    };
    const issues = Array.isArray(payload.issues) ? payload.issues : [];
    return {
      accountId: this.accountId,
      userId: teamworkGraphUserId(this.accountId),
      workItems: issues.map((issue) => ({
        id: issue.id ?? issue.key ?? "unknown",
        ...(issue.key ? { key: issue.key } : {}),
        ...(issue.fields?.summary ? { summary: issue.fields.summary } : {}),
        ...(issue.fields?.updated ? { resolvedAt: issue.fields.updated } : {}),
        ...(issue.self ? { webUrl: issue.self.replace("/rest/api/3/issue/", "/browse/") } : {}),
        ...(issue.fields?.issuetype?.name ? { issueType: issue.fields.issuetype.name } : {}),
      })),
      pullRequests: [],
      checkedAt: new Date().toISOString(),
      source: "jira-assigned-work",
    } as TeamworkGraphSnapshot;
  }

  /** Turn platform consent errors into an actionable message for judges. */
  private explainError(message: string): string {
    if (/NO_IMPERSONATION_SCOPES_DEFINED/i.test(message)) {
      return "Teamwork Graph scopes (read:graph:user:atlassian, read:graph:issue:jira, read:graph:pull-request:external) have not been granted for this installation. An organization admin must approve the graph scopes in the app's installation settings.";
    }
    if (/not installed|no access|FORBIDDEN/i.test(message)) {
      return `Teamwork Graph access denied: ${message}`;
    }
    return message;
  }

  async healthCheck(): Promise<HealthResult> {
    if (!this.accountId) {
      return { healthy: false, message: "Teamwork Graph requires a user context (accountId unavailable).", checkedAt: new Date().toISOString() };
    }
    try {
      const snapshot = await this.inspect(1);
      return {
        healthy: true,
        message: `Connected as current user; ${snapshot.workItems.length} assigned work item(s), ${snapshot.pullRequests.length} pull request(s) returned.`,
        checkedAt: snapshot.checkedAt,
      };
    } catch (error) {
      return { healthy: false, message: (error as Error).message, checkedAt: new Date().toISOString() };
    }
  }

  async getCapabilities(): Promise<Capability[]> {
    return [{ name: "curated-queries", available: Boolean(this.accountId) }];
  }

  async fetchPage<T>(request: ProviderRequest): Promise<ProviderResult<T>> {
    if (!this.accountId) {
      return { data: {} as T, source: "teamwork-graph", retrievedAt: new Date().toISOString(), partial: true, warnings: ["Teamwork Graph requires user context"] };
    }
    try {
      const snapshot = await this.inspect(request.limit ?? 25);
      return { data: snapshot as T, source: "teamwork-graph", retrievedAt: snapshot.checkedAt, partial: false, warnings: [] };
    } catch (error) {
      return { data: {} as T, source: "teamwork-graph", retrievedAt: new Date().toISOString(), partial: true, warnings: [`Teamwork Graph unavailable: ${(error as Error).message}`] };
    }
  }

  async execute() { return { success: false, message: "Not implemented" }; }
  async disconnect() { return; }
}
