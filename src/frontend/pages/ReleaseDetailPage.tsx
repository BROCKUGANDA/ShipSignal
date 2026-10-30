import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, LoadingState, ErrorState } from "../components/Common";
import { Tabs } from "../components/Tabs";
import { useResolver } from "../hooks/useResolver";

const TABS = ["Summary", "Readiness", "Evidence", "Risks", "Audit"];

export default function ReleaseDetailPage() {
  const { releaseId } = useParams();
  const [active, setActive] = useState("Summary");
  const { data, loading, error, call } = useResolver<Record<string, unknown>>("getReleaseReadiness");

  useEffect(() => {
    if (releaseId) void call({ releaseId });
  }, [releaseId, call]);

  return (
    <div>
      <PageHeader title={`Release ${releaseId ?? ""}`} subtitle="Readiness assessment and evidence." />
      <Tabs tabs={TABS} active={active} onChange={setActive} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={() => releaseId && void call({ releaseId })} /> : null}
      {!loading && !error && data ? (
        <div>
          {active === "Summary" ? <p>Release summary and status.</p> : null}
          {active === "Readiness" ? <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre> : null}
          {active === "Evidence" ? <p>Evidence records linked to this release.</p> : null}
          {active === "Risks" ? <p>Risk factors and blockers.</p> : null}
          {active === "Audit" ? <p>Audit history for this release.</p> : null}
        </div>
      ) : null}
    </div>
  );
}