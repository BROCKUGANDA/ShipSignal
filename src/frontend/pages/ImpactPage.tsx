import React from "react";
import { PageHeader, EmptyState } from "../components/Common";
export default function ImpactPage() {
  return (<div><PageHeader title="Change Impact" subtitle="Understand the effect of a change." /><EmptyState title="No change selected" description="Select a change to analyze impact." /></div>);
}