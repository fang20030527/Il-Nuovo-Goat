import { expect, test } from "@playwright/test";
import { createCareerFromUi, driveCareer } from "./helpers";

test("detailed mode restores and resolves a paused key moment", async ({ page }) => {
  test.setTimeout(90_000);
  await createCareerFromUi(page, { slot: 1, name: "Detail Runner", seed: "detail-e2e", mode: "detailed" });

  await driveCareer(page, async () => (await page.getByTestId("active-moment").count()) > 0);
  const moment = page.getByTestId("active-moment");
  await expect(moment).toBeVisible();
  const before = await moment.textContent();

  await page.reload();
  await expect(page.getByTestId("active-moment")).toHaveText(before!);

  await page.getByTestId("active-moment").locator("[data-game-action]").first().click();
  await page.locator('[data-game-action="ACKNOWLEDGE_MATCH"]').click();
  await expect(page.getByText(/Match report/)).not.toBeVisible();
  await expect(page.getByTestId("current-phase")).not.toHaveText("detailed-postmatch");
});
