import React from "react";
import { PageHeader, EmptyState } from "../components/Common";
export default function EvidencePage() {
  return (<div><PageHeader title="Evidence" subtitle="Provenance of retrieved information." /><EmptyState title="No evidence" description="Evidence is collected during synchronization." /></div>);
}