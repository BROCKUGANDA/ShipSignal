import React from "react";
import { PageHeader, EmptyState } from "../components/Common";
export default function IntegrationsPage() {
  return (<div><PageHeader title="Integrations" subtitle="Connection and authorization status." /><EmptyState title="No integrations configured" description="Configure Jira, Bitbucket, Confluence and Compass." /></div>);
}