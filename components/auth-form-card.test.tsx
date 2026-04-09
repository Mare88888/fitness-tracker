import { render, screen } from "@testing-library/react";
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
  it("disables submit and shows inline validity hint initially", () => {
    render(<AuthFormCard mode="login" />);

    expect(screen.getByRole("button", { name: "Login" })).toBeDisabled();
    expect(
      screen.getByText("Username must be at least 3 characters and password at least 6 characters.")
    ).toBeInTheDocument();
  });
});
