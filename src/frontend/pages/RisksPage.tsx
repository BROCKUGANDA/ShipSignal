import React from "react";
import { PageHeader, EmptyState } from "../components/Common";
export default function RisksPage() {
  return (<div><PageHeader title="Risks" subtitle="Risk register and mitigation." /><EmptyState title="No risks" description="Risks are generated from release assessments." /></div>);
}