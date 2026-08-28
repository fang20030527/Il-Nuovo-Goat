import { expect, test } from "@playwright/test";

test("creates, reloads, exports, deletes, and imports a local career", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "New career" }).first().click();

  await page.getByLabel("Player name").fill("Mira Vale");
  await page.getByLabel("midfielder").check();
  await page.getByLabel("Seed").fill("e2e-save");
  await page.getByRole("button", { name: "Create career" }).click();

  await expect(page).toHaveURL(/\/career\/1/);
  await expect(page.getByRole("heading", { name: /Mira Vale/ }).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: /Mira Vale/ }).first()).toBeVisible();

  await page.goto("/");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).first().click();
  const download = await downloadPromise;
  const exportedPath = await download.path();
  expect(exportedPath).not.toBeNull();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).first().click();
  await expect(page.getByRole("link", { name: "New career" }).first()).toBeVisible();

  await page.locator('input[type="file"]').first().setInputFiles(exportedPath!);
  await expect(page.getByRole("link", { name: "Continue" }).first()).toBeVisible();
  await page.getByRole("link", { name: "Continue" }).first().click();
  await expect(page.getByRole("heading", { name: /Mira Vale/ }).first()).toBeVisible();
});
