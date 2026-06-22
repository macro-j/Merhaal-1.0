import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeAll } from "vitest";
import Home from "./Home";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    value: MockIntersectionObserver,
  });
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <LanguageProvider>
      <ThemeProvider defaultTheme="light" switchable>
        {component}
      </ThemeProvider>
    </LanguageProvider>
  );
};

describe("Home Page", () => {
  it("renders hero section with title", () => {
    renderWithProviders(<Home />);
    expect(screen.getByTestId("text-hero-title")).toBeDefined();
  });

  it("renders destination cities", () => {
    renderWithProviders(<Home />);
    expect(screen.getAllByText(/الرياض/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/جدة/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/العلا/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/أبها/).length).toBeGreaterThan(0);
  });

  it("renders features section", () => {
    renderWithProviders(<Home />);
    expect(screen.getByTestId("text-features-title")).toBeDefined();
  });

  it("renders navigation menu", () => {
    renderWithProviders(<Home />);
    expect(screen.getAllByText(/الرئيسية/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/خطط رحلة/).length).toBeGreaterThan(0);
  });
});
