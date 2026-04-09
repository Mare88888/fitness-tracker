import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthFormCard } from "@/components/auth-form-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/services/auth-service", () => ({
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AuthFormCard", () => {
  it("shows validation error when fields are empty", () => {
    render(<AuthFormCard mode="login" />);

    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByText("Username and password are required.")).toBeInTheDocument();
  });
});
