import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Header from "@/components/layout/Header";

vi.mock("@/store/store", () => ({
  useStore: () => ({ user: null, logout: vi.fn() }),
}));

afterEach(cleanup);
beforeEach(() => { window.scrollTo = vi.fn(); });

describe("mobile navigation", () => {
  it("only adds its links to the document while the menu is open", () => {
    render(<MemoryRouter><Header /></MemoryRouter>);

    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("mobile-navigation")).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("mobile-navigation")).toBeInTheDocument();
    expect(document.querySelector('#mobile-navigation a[href="/assets"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(document.getElementById("mobile-navigation")).not.toBeInTheDocument();
  });
});
