import { describe, it, expect, beforeEach } from "vitest";
import {
  repository,
  isValidUUID,
  getLocalDateString,
} from "./repository";

describe("Database Repository & Calorie Tracking", () => {
  it("validates UUIDs correctly without throwing on AI candidate string keys", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidUUID("pho_bo_chin")).toBe(false);
    expect(isValidUUID("seed-pho-bo")).toBe(false);
    expect(isValidUUID("")).toBe(false);
    expect(isValidUUID(undefined)).toBe(false);
    expect(isValidUUID(null)).toBe(false);
  });

  it("formats local dates accurately for device timezones", () => {
    const d = new Date(2026, 9, 30, 23, 30, 0); // October 30, 2026
    expect(getLocalDateString(d)).toBe("2026-10-30");
  });

  it("saves AI meal with non-UUID foodId and calculates consumed calories and remaining deficit correctly", async () => {
    const todayStr = getLocalDateString();
    const nowIso = new Date().toISOString();

    const savedMeal = await repository.saveMeal({
      mealType: "lunch",
      eatenAt: nowIso,
      notes: "Phở bò đặc biệt nhiều thịt",
      analysisStatus: "ai_confirmed",
      items: [
        {
          foodId: "pho_bo_chin",
          foodName: "Phở bò chín (bát đầy đặn)",
          portionG: 450,
          nutrition: {
            calories: 520,
            protein: 34,
            carbs: 68,
            fat: 12,
            fiber: 3,
          },
          isAiEstimated: true,
          confidence: 0.95,
        },
        {
          foodId: "rau_hung_gia",
          foodName: "Rau sống & giá đỗ trụng",
          portionG: 80,
          nutrition: {
            calories: 25,
            protein: 2,
            carbs: 4,
            fat: 0.2,
            fiber: 2.1,
          },
          isAiEstimated: true,
          confidence: 0.92,
        },
      ],
    });

    expect(savedMeal).toBeDefined();
    expect(savedMeal.items).toHaveLength(2);

    // Verify meals for today can be retrieved and accurately aggregated
    const todayMeals = await repository.getMealsForDate(todayStr);
    expect(todayMeals.length).toBeGreaterThanOrEqual(1);

    const targetMeal = todayMeals.find((m) => m.id === savedMeal.id);
    expect(targetMeal).toBeDefined();
    expect(targetMeal?.items).toHaveLength(2);

    // Aggregate macros
    let totalCalories = 0;
    let totalProtein = 0;
    targetMeal?.items.forEach((it) => {
      totalCalories += it.calories;
      totalProtein += it.protein;
    });

    expect(totalCalories).toBe(545);
    expect(totalProtein).toBe(36);

    // Verify remaining calories decreases from goal target (e.g., 2000 - 545 = 1455)
    const dailyTarget = 2000;
    const remainingCalories = dailyTarget - totalCalories;
    expect(remainingCalories).toBe(1455);
  });
});

