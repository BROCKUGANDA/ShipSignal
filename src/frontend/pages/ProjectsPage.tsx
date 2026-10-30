import React from "react";
import { PageHeader, EmptyState } from "../components/Common";
export default function ProjectsPage() {
  return (<div><PageHeader title="Projects" subtitle="Project portfolio and health." /><EmptyState title="No projects" description="Connect a Jira project to begin." /></div>);
}