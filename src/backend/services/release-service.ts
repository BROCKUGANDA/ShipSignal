import { ReleaseRepository } from "../repositories/release-repository";
import { assessRelease } from "../../domain/risk-engine";
import type { Release, RiskAssessment, EvidenceReference } from "../../domain/types";

export class ReleaseService {
  private repo = new ReleaseRepository();

  async getRelease(workspaceId: string, releaseId: string): Promise<Release | null> {
    return this.repo.findById(workspaceId, releaseId);
  }

  async listReleases(workspaceId: string): Promise<Release[]> {
    return this.repo.listByWorkspace(workspaceId);
  }

  async assessReleaseReadiness(
    workspaceId: string,
    releaseId: string,
    evidence: EvidenceReference[],
    flags: { hasUnreviewedChanges: boolean; hasMissingDocs: boolean; hasCriticalIssues: boolean }
  ): Promise<RiskAssessment | null> {
    const release = await this.repo.findById(workspaceId, releaseId);
    if (!release) return null;
    return assessRelease(release, evidence, flags);
  }
}