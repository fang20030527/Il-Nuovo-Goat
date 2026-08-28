import { expect, test } from "@playwright/test";
import { createCareerFromUi, driveCareer } from "./helpers";

test("classic mode reaches an explained age-36 retirement", async ({ page }) => {
  test.setTimeout(180_000);
  await createCareerFromUi(page, { slot: 1, name: "Classic Runner", seed: "classic-e2e", mode: "classic" });

  await driveCareer(page, () => page.url().endsWith("/retirement"));

  // The retired phase has no commands; navigate via the score link. Use the
  // keyboard so a transient layout shift can never stall the click.
  const scoreLink = page.getByRole("link", { name: "View career score" });
  if (await scoreLink.count()) {
    await scoreLink.press("Enter");
  }

  await expect(page).toHaveURL(/\/retirement$/);
  await expect(page.getByText(/GOAT score:/)).toBeVisible();
  await expect(page.getByRole("row", { name: /Performance/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Influence/ })).toBeVisible();

  await page.getByRole("link", { name: "Archive" }).click();
  await expect(page.locator("tbody tr").first()).toBeVisible();
});
