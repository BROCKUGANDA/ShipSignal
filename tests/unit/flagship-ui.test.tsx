import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill, FreshnessChip, VerdictBanner } from "../../src/frontend/components/Common";
describe("flagship-ui", () => {
  it("StatusPill renders every release verdict with an accessible label", () => {
    for (const v of ["SHIP", "SHIP_WITH_GUARDRAILS", "HOLD", "INSUFFICIENT_EVIDENCE"]) {
      const label = v.replaceAll("_", " ");
      const { unmount } = render(<StatusPill status={v} />);
      const pill = screen.getByLabelText(`Status ${label}`);
      expect(pill.textContent).toContain(label);
      unmount();
    }
  });

  it("FreshnessChip exposes freshness to assistive tech", () => {
    render(<FreshnessChip freshness="STALE" />);
    expect(screen.getByLabelText("Evidence freshness STALE").textContent).toBe("STALE");
  });

  it("VerdictBanner announces verdict, confidence, risk and policy", () => {
    render(<VerdictBanner verdict="HOLD" confidence={62} riskScore={78} policyVersion="2026-11-26.1" />);
    const banner = screen.getByRole("status");
    expect(banner.getAttribute("aria-label")).toBe("Release verdict HOLD");
    expect(banner.textContent).toContain("HOLD");
    expect(banner.textContent).toContain("62%");
    expect(banner.textContent).toContain("2026-11-26.1");
  });

  it("VerdictBanner omits policy when unknown", () => {
    render(<VerdictBanner verdict="SHIP" confidence={91} riskScore={null} />);
    const banner = screen.getByRole("status");
    expect(banner.textContent).toContain("SHIP");
    expect(banner.textContent).not.toContain("2026-11-26.1");
  });
});
