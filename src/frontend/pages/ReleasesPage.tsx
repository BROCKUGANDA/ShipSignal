import React from "react";
import { PageHeader, EmptyState } from "../components/Common";

export default function ReleasesPage() {
  return (
    <div>
      <PageHeader title="Releases" subtitle="Track release readiness across projects." />
      <EmptyState title="No releases found" description="Releases will appear once a project is synchronized." />
    </div>
  );
}