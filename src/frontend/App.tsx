import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Shell from "./layouts/Shell";
import OverviewPage from "./pages/OverviewPage";
import ReleasesPage from "./pages/ReleasesPage";
import ReleaseDetailPage from "./pages/ReleaseDetailPage";
import ProjectsPage from "./pages/ProjectsPage";
import DependenciesPage from "./pages/DependenciesPage";
import RisksPage from "./pages/RisksPage";
import EvidencePage from "./pages/EvidencePage";
import ImpactPage from "./pages/ImpactPage";
import AssistantPage from "./pages/AssistantPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import ActivityPage from "./pages/ActivityPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/releases" element={<ReleasesPage />} />
        <Route path="/releases/:releaseId" element={<ReleaseDetailPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/dependencies" element={<DependenciesPage />} />
        <Route path="/risks" element={<RisksPage />} />
        <Route path="/evidence" element={<EvidencePage />} />
        <Route path="/impact" element={<ImpactPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}