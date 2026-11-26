import { describe, it, expect, vi, beforeEach } from "vitest";

const requests: Array<{ product: string; url: string }> = [];
let nextResponse: { ok: boolean; status: number; body: unknown } = { ok: true, status: 200, body: {} };

function makeProductMethod(product: string) {
  return (routeObj: unknown) => {
    const url = typeof routeObj === "string" ? routeObj : String((routeObj as { value?: string })?.value ?? routeObj);
    requests.push({ product, url });
    return Promise.resolve({
      ok: nextResponse.ok,
      status: nextResponse.status,
      json: async () => nextResponse.body,
    });
  };
}

vi.mock("@forge/api", () => {
  const api = {
    asApp: () => ({
      requestJira: makeProductMethod("jira"),
      requestConfluence: makeProductMethod("confluence"),
      requestBitbucket: makeProductMethod("bitbucket"),
      requestGraph: (_query: string, variables: unknown) => {
        requests.push({ product: "graph", url: JSON.stringify(variables) });
        return Promise.resolve({
          ok: nextResponse.ok,
          status: nextResponse.status,
          json: async () => nextResponse.body,
        });
      },
    }),
    asUser: () => ({
      requestTeamworkGraph: () => Promise.resolve({ ok: false, status: 401, json: async () => ({ errors: [{ message: "NO_IMPERSONATION_SCOPES_DEFINED" }] }) }),
    }),
  };
  const route = (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, part, i) => acc + part + (values[i] ?? ""), "");
  return { default: api, route, __esModule: true };
});

import { JiraAdapter } from "../../src/backend/integrations/jira-adapter";
import { ConfluenceAdapter } from "../../src/backend/integrations/confluence-adapter";
import { CompassAdapter } from "../../src/backend/integrations/compass-adapter";
import { BitbucketAdapter } from "../../src/backend/integrations/bitbucket-adapter";

describe("provider endpoint contracts", () => {
  beforeEach(() => {
    requests.length = 0;
    nextResponse = { ok: true, status: 200, body: {} };
  });

  it("Jira health check never uses the user-only /myself endpoint", async () => {
    await new JiraAdapter().healthCheck();
    expect(requests[0]?.url).toContain("/rest/api/3/project/search");
    expect(requests.some((r) => r.url.includes("/myself"))).toBe(false);
  });

  it("Jira issue search uses the /search/jql replacement endpoint", async () => {
    nextResponse = { ok: true, status: 200, body: { issues: [] } };
    await new JiraAdapter().fetchIssuesForVersion("2.4.0");
    expect(requests[0]?.url).toContain("/rest/api/3/search/jql");
  });

  it("Confluence uses v2 endpoints (v1 space/content are 410 Gone)", async () => {
    await new ConfluenceAdapter().healthCheck();
    expect(requests[0]?.url).toContain("/wiki/api/v2/spaces");
    requests.length = 0;
    nextResponse = { ok: true, status: 200, body: { results: [] } };
    await new ConfluenceAdapter().fetchPages(5);
    expect(requests[0]?.url).toContain("/wiki/api/v2/pages");
    expect(requests.some((r) => r.url.includes("/wiki/rest/api/"))).toBe(false);
  });

  it("Compass queries the compass.searchComponents root field with a cloudId", async () => {
    nextResponse = { ok: true, status: 200, body: { data: { compass: { searchComponents: { nodes: [] } } } } };
    const adapter = new CompassAdapter("cloud-1");
    await adapter.healthCheck();
    const variables = JSON.parse(requests[0]!.url) as { cloudId?: string };
    expect(variables.cloudId).toBe("cloud-1");
  });

  it("Compass reports a missing cloudId honestly instead of calling the gateway", async () => {
    const result = await new CompassAdapter(undefined).healthCheck();
    expect(result.healthy).toBe(false);
    expect(result.message).toMatch(/cloudId/);
    expect(requests).toHaveLength(0);
  });

  it("Bitbucket translates INVALID_REMOTE into an actionable message", async () => {
    // Simulate the Forge proxy rejecting the call entirely.
    const mod = await import("../../src/backend/integrations/bitbucket-adapter");
    const bb = new mod.BitbucketAdapter();
    const method = (bb as unknown as { healthCheck: () => Promise<{ healthy: boolean; message?: string }> });
    // Swap in a throwing product call by stubbing the mocked api's requestBitbucket.
    const forgeApi = (await import("@forge/api")).default as unknown as {
      asApp: () => { requestBitbucket: () => Promise<unknown> };
    };
    const originalAsApp = forgeApi.asApp;
    forgeApi.asApp = () => ({
      requestBitbucket: () => Promise.reject(new Error("Forge platform failed to process runtime HTTP request - 400 - INVALID_REMOTE")),
    });
    try {
      const result = await method.healthCheck();
      expect(result.healthy).toBe(false);
      expect(result.message ?? "").toMatch(/workspace-scoped/);
    } finally {
      forgeApi.asApp = originalAsApp;
    }
  });
});
