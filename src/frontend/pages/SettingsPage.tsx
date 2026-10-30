import React from "react";
import { PageHeader, EmptyState } from "../components/Common";
export default function SettingsPage() {
  return (<div><PageHeader title="Administration" subtitle="Workspace settings and policies." /><EmptyState title="No settings" description="Settings will be available after installation." /></div>);
}