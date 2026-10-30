import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, LoadingState, ErrorState } from "../components/Common";
import { useResolver } from "../hooks/useResolver";

export default function ReleaseDetailPage() {
  const { releaseId } = useParams();
  const { data, loading, error, call } = useResolver<unknown>("getReleaseReadiness");

  useEffect(() => {
    if (releaseId) void call({ releaseId });
  }, [releaseId, call]);

  return (
    <div>
      <PageHeader title={`Release ${releaseId ?? ""}`} subtitle="Readiness assessment and evidence." />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={() => releaseId && void call({ releaseId })} /> : null}
      {!loading && !error && data ? <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre> : null}
    </div>
  );
}