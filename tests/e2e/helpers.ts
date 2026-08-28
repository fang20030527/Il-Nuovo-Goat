import { expect, type Page } from "@playwright/test";

export const createCareerFromUi = async (
  page: Page,
  input: { slot: 1 | 2 | 3; name: string; seed: string; mode: "classic" | "detailed" },
) => {
  await page.goto("/");
  await page.getByRole("link", { name: "New career" }).nth(input.slot - 1).click();
  await page.getByLabel("Player name").fill(input.name);
  await page.getByLabel("midfielder").check();
  await page.getByLabel("Seed").fill(input.seed);
  await page.getByLabel("Mode").selectOption(input.mode);
  await page.getByLabel("Starting club").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Create career" }).click();
  await expect(page).toHaveURL(new RegExp(`/career/${input.slot}$`));
};

/**
 * Drives the career UI forward by choosing legal commands with the same
 * priorities as the engine's auto-strategy: resolve a transfer window once
 * (prefer an upgrade, otherwise stay), then start the next season; in every
 * other phase click the first enabled game action and wait for the phase to
 * change. Stops when `done` returns true.
 */
export const driveCareer = async (page: Page, done: () => boolean | Promise<boolean>, maxActions = 1_000) => {
  let stayUsedInWindow = false;
  for (let action = 0; action < maxActions; action += 1) {
    if (await done()) return;
    const phase = await page.getByTestId("current-phase").textContent();
    // Retired has no legal commands; the caller navigates onward.
    if (phase === "retired") return;
    let target;
    if (phase === "transfer-window" || phase === "season-review") {
      if (phase === "transfer-window" && stayUsedInWindow) {
        target = page.locator('[data-game-action="START_NEXT_SEASON"]:not([disabled])');
      } else {
        target = page.locator('[data-game-action="CHOOSE_TRANSFER"]:not([disabled])', { hasText: "Stay" });
        stayUsedInWindow = true;
      }
    } else {
      stayUsedInWindow = false;
      target = page.locator("[data-game-action]:not([disabled])").first();
    }
    if (!(await target.count())) {
      throw new Error(`No legal action in phase ${phase}`);
    }
    await target.click({ timeout: 10_000 });
    // Stay/seek keep the same phase by design; everything else must advance.
    if (phase === "transfer-window" || phase === "season-review") {
      await page.waitForTimeout(200);
    } else {
      await expect(page.getByTestId("current-phase")).not.toHaveText(phase!, { timeout: 15_000 });
    }
  }
  throw new Error(`Career did not finish within ${maxActions} actions`);
};
