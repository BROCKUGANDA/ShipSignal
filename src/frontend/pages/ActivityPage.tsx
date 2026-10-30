import React from "react";
import { PageHeader, EmptyState } from "../components/Common";
export default function ActivityPage() {
  return (<div><PageHeader title="Activity & Audit" subtitle="Searchable audit records." /><EmptyState title="No activity" description="Audit events appear after operations." /></div>);
}