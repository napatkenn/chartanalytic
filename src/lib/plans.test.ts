import { describe, it, expect } from "vitest";
import { isUpgrade, getProratedUpgradeAmount, PLANS } from "./plans";

describe("plans", () => {
  describe("isUpgrade", () => {
    it("returns false when new tier is same as current", () => {
      expect(isUpgrade("starter", "starter")).toBe(false);
      expect(isUpgrade("active", "active")).toBe(false);
      expect(isUpgrade("advanced", "advanced")).toBe(false);
    });

    it("returns false when new tier is lower than current", () => {
      expect(isUpgrade("active", "starter")).toBe(false);
      expect(isUpgrade("advanced", "starter")).toBe(false);
      expect(isUpgrade("advanced", "active")).toBe(false);
    });

    it("returns true when new tier is higher than current", () => {
      expect(isUpgrade("starter", "active")).toBe(true);
      expect(isUpgrade("starter", "advanced")).toBe(true);
      expect(isUpgrade("active", "advanced")).toBe(true);
    });
  });

  describe("getProratedUpgradeAmount", () => {
    it("returns at least 0.01 when period is in the future", () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      const amount = getProratedUpgradeAmount("starter", "active", future);
      expect(amount).toBeGreaterThanOrEqual(0.01);
    });

    it("returns 0 when periodEnd is in the past", () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      expect(getProratedUpgradeAmount("starter", "active", past)).toBe(0);
    });

    it("returns 0 when periodEnd is now", () => {
      const now = new Date();
      expect(getProratedUpgradeAmount("starter", "active", now)).toBe(0);
    });

    it("upgrade from starter to active: positive amount for remaining days", () => {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 3);
      const amount = getProratedUpgradeAmount("starter", "active", periodEnd);
      // Starter 2.99/7 days, Active 9.99/30 days. For 3 days: prorated new = 9.99*3/30, prorated current = 2.99*3/7. Delta should be positive.
      expect(amount).toBeGreaterThan(0);
      expect(amount).toBeLessThanOrEqual(PLANS.active.priceAmount);
    });

    it("rounds to two decimal places", () => {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 10);
      const amount = getProratedUpgradeAmount("starter", "active", periodEnd);
      expect(Number.isInteger(amount * 100)).toBe(true);
    });
  });
});
