import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("login, create workout, view history and details", async ({ page }) => {
  const username = `e2e_${Date.now()}`;
  const password = "password123";
  const workoutName = `E2E Push Day ${Date.now()}`;

  await page.goto("/auth/register");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page).toHaveURL(/\/workouts\/start/);

  await page.getByLabel("Workout name").fill(workoutName);
  await page.getByPlaceholder("e.g. Bench Press").fill("Bench Press");
  await page.getByPlaceholder("Reps").first().fill("8");
  await page.getByPlaceholder("Weight (kg)").first().fill("60");
  await page.getByRole("button", { name: "Save workout" }).click();

  await expect(page.getByText("Workout created successfully")).toBeVisible();

  await page.getByRole("link", { name: "History" }).first().click();
  await expect(page.getByText(workoutName)).toBeVisible();

  await page.getByRole("link", { name: "View details" }).first().click();
  await expect(page.getByRole("heading", { name: workoutName })).toBeVisible();

  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/auth\/login/);

  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/workouts\/start/);
});
