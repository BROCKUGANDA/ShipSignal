import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../../src/frontend/components/Common";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="No data" description="Nothing here" />);
    expect(screen.getByText("No data")).toBeTruthy();
    expect(screen.getByText("Nothing here")).toBeTruthy();
  });
});