// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { generateTrip } from "@/lib/llm";
import PlanTrip from "./PlanTrip";

vi.mock("@/lib/llm", async () => {
  const actual = await vi.importActual<typeof import("@/lib/llm")>("@/lib/llm");
  return {
    ...actual,
    generateTrip: vi.fn(),
  };
});

function renderPage() {
  return render(
    <LanguageProvider>
      <ThemeProvider defaultTheme="light" switchable>
        <PlanTrip />
      </ThemeProvider>
    </LanguageProvider>
  );
}

describe("PlanTrip app flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("marhal-language", "en");
  });

  it("uses four focused steps and keeps coming-soon cities unavailable", () => {
    renderPage();

    expect(screen.getByText(/Step 1 of 4/)).toBeDefined();
    expect(screen.getByRole("button", { name: /Riyadh/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Jeddah/ })).toBeDefined();
    expect(screen.queryByRole("button", { name: /Taif/ })).toBeNull();
    expect(screen.getAllByText("Soon")).toHaveLength(3);

    const next = screen.getByTestId("button-next-desktop") as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Riyadh/ }));
    expect(next.disabled).toBe(false);
    fireEvent.click(next);
    expect(screen.getByText(/Step 2 of 4/)).toBeDefined();
  });

  it("shows a bilingual app-like loading state without a fake percentage", async () => {
    vi.mocked(generateTrip).mockImplementation(() => new Promise(() => {}));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Riyadh/ }));
    fireEvent.click(screen.getByTestId("button-next-desktop"));
    fireEvent.click(screen.getByTestId("button-open-calendar"));
    fireEvent.click(screen.getByRole("button", { name: /Today/ }));
    fireEvent.click(screen.getByTestId("button-next-desktop"));
    fireEvent.click(screen.getByTestId("button-next-desktop"));
    fireEvent.click(screen.getByTestId("button-interest-ترند ولايف ستايل"));
    fireEvent.click(screen.getByTestId("button-generate-desktop"));

    await waitFor(() =>
      expect(screen.getByTestId("overlay-generating")).toBeDefined()
    );
    expect(screen.getByText("Designing your trip")).toBeDefined();
    expect(screen.getByText("Preparing your trip")).toBeDefined();
    expect(document.body.textContent).not.toMatch(/%|percent/i);
  });
});
