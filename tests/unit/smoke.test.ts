import { describe, expect, it } from "vitest";
import { APP_NAME } from "@/game/constants";

describe("project foundation", () => {
  it("exposes the original product name", () => {
    expect(APP_NAME).toBe("Il Nuovo Goat");
  });
});
