import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmModal } from "@/components/ui/confirm-modal";

afterEach(() => {
  cleanup();
});

describe("ConfirmModal", () => {
  it("renders title and description when open", () => {
    render(
      <ConfirmModal
        isOpen
        title="Delete workout?"
        description="This action cannot be undone."
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText("Delete workout?")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
  });

  it("calls confirm and cancel callbacks", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmModal
        isOpen
        title="Delete workout?"
        description="Confirm delete"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
