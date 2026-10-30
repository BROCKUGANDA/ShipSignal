import React from "react";
import { PageHeader, EmptyState } from "../components/Common";
export default function DependenciesPage() {
  return (<div><PageHeader title="Dependencies" subtitle="Service topology and impact." /><EmptyState title="No dependencies" description="Dependencies appear after synchronization." /></div>);
}