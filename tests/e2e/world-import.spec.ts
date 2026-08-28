import { expect, test } from "@playwright/test";

test("invalid world import cannot replace the active world", async ({ page }) => {
  await page.goto("/world");
  await expect(page.getByRole("heading", { name: "Active world", exact: true })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: "invalid-world.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, countries: [], leagues: [], clubs: [] })),
  });
  await expect(page.locator(".error-text")).toContainText("Import issues");

  await page.reload();
  await expect(page.getByText("4", { exact: true }).first()).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export world" }).click();
  const validWorld = await downloadPromise;
  const exportedPath = await validWorld.path();
  expect(exportedPath).not.toBeNull();

  await page.locator('input[type="file"]').setInputFiles(exportedPath!);
  await page.getByRole("button", { name: "Replace active world" }).click();
  await expect(page.getByRole("heading", { name: "Active world", exact: true })).toBeVisible();
});
