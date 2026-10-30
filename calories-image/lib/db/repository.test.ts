import { describe, it, expect, beforeEach } from "vitest";
import {
  repository,
  isValidUUID,
  getLocalDateString,
  formatToVietnamDateTimeLocal,
  vietnamDateTimeLocalToIso,
  deduplicateMealList,
  type StoredMeal,
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

  it("formats local dates accurately strictly in Vietnam timezone (Asia/Ho_Chi_Minh)", () => {
    // 17:15 UTC on Oct 30 is 00:15 on Oct 31 in Vietnam (UTC+7)
    const d1 = new Date("2026-10-30T17:15:00Z");
    expect(getLocalDateString(d1)).toBe("2026-10-31");
    expect(formatToVietnamDateTimeLocal(d1)).toBe("2026-10-31T00:15");

    // 10:00 UTC on Oct 30 is 17:00 on Oct 30 in Vietnam (UTC+7)
    const d2 = new Date("2026-10-30T10:00:00Z");
    expect(getLocalDateString(d2)).toBe("2026-10-30");
    expect(formatToVietnamDateTimeLocal(d2)).toBe("2026-10-30T17:00");

    // Vietnam local datetime conversion to ISO
    const iso = vietnamDateTimeLocalToIso("2026-10-30T19:30");
    expect(iso).toBe("2026-10-30T12:30:00.000Z");
  });

  it("updates meal date, time, and mealType, moving meals between days accurately", async () => {
    // Save a meal on Oct 31 initially
    const saved = await repository.saveMeal({
      mealType: "dinner",
      eatenAt: "2026-10-30T17:15:00.000Z", // 00:15 on 2026-10-31 Vietnam time
      notes: "Ăn đêm",
      analysisStatus: "manual",
      items: [
        {
          foodName: "Cháo gà",
          portionG: 250,
          nutrition: { calories: 300, protein: 20, carbs: 40, fat: 5, fiber: 1 },
        },
      ],
    });

    expect(saved.id).toBeDefined();

    // Verify it initially shows up on Oct 31 in Vietnam
    let oct31Meals = await repository.getMealsForDate("2026-10-31");
    expect(oct31Meals.some((m) => m.id === saved.id)).toBe(true);

    // Now update meal time to 20:00 on Oct 30 (user intended dinner on Oct 30)
    const newEatenAtIso = vietnamDateTimeLocalToIso("2026-10-30T20:00");
    const updated = await repository.updateMeal(saved.id, {
      eatenAt: newEatenAtIso,
      mealType: "dinner",
      notes: "Bữa tối đã dời về ngày 30",
    });

    expect(updated).toBeDefined();
    expect(updated?.eatenAt).toBe(newEatenAtIso);

    // Verify it is no longer on Oct 31, but now on Oct 30!
    oct31Meals = await repository.getMealsForDate("2026-10-31");
    expect(oct31Meals.some((m) => m.id === saved.id)).toBe(false);

    const oct30Meals = await repository.getMealsForDate("2026-10-30");
    expect(oct30Meals.some((m) => m.id === saved.id)).toBe(true);
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

  it("deduplicateMealList identifies and filters duplicate meals created by runaway sync loops", () => {
    const baseTime = "2026-10-30T17:07:00.000Z";
    const duplicateMeal1: StoredMeal = {
      id: "meal-dup-1",
      userId: "user-123",
      mealType: "lunch",
      eatenAt: baseTime,
      analysisStatus: "ai_confirmed",
      createdAt: baseTime,
      items: [
        {
          id: "item-1",
          mealId: "meal-dup-1",
          foodNameSnapshot: "Bí đỏ nhồi thịt hấp",
          portionG: 350,
          calories: 280,
          protein: 18.5,
          carbs: 22,
          fat: 14,
          fiber: 4,
          nutritionSource: "AI Vision",
          isAiEstimated: true,
        },
      ],
    };

    const duplicateMeal2: StoredMeal = {
      ...duplicateMeal1,
      id: "meal-dup-2",
      eatenAt: "2026-10-30T17:07:05.000Z", // 5 seconds later
      items: duplicateMeal1.items.map((it) => ({ ...it, id: "item-2", mealId: "meal-dup-2" })),
    };

    const differentMeal: StoredMeal = {
      id: "meal-diff",
      userId: "user-123",
      mealType: "dinner",
      eatenAt: "2026-10-30T19:30:00.000Z",
      analysisStatus: "manual",
      createdAt: "2026-10-30T19:30:00.000Z",
      items: [
        {
          id: "item-diff",
          mealId: "meal-diff",
          foodNameSnapshot: "Salad ức gà",
          portionG: 200,
          calories: 250,
          protein: 30,
          carbs: 5,
          fat: 8,
          fiber: 3,
          nutritionSource: "Thủ công",
          isAiEstimated: false,
        },
      ],
    };

    const mealsWithDuplicates = [duplicateMeal1, duplicateMeal2, differentMeal];
    const { unique, duplicateIds } = deduplicateMealList(mealsWithDuplicates);

    expect(unique).toHaveLength(2);
    expect(duplicateIds).toEqual(["meal-dup-2"]);
    expect(unique.find((m) => m.id === "meal-dup-1")).toBeDefined();
    expect(unique.find((m) => m.id === "meal-diff")).toBeDefined();
  });

  it("deletes a meal and immediately verifies its removal", async () => {
    const saved = await repository.saveMeal({
      mealType: "dinner",
      eatenAt: new Date().toISOString(),
      notes: "Cơm gia đình",
      analysisStatus: "manual",
      items: [
        {
          foodName: "Cơm trắng",
          portionG: 150,
          nutrition: { calories: 195, protein: 4, carbs: 42, fat: 0.4, fiber: 0.6 },
        },
      ],
    });

    expect(saved.id).toBeDefined();

    // Verify it exists in all meals
    let all = await repository.getAllMeals();
    expect(all.some((m) => m.id === saved.id)).toBe(true);

    // Delete the meal
    await repository.deleteMeal(saved.id);

    // Verify it no longer exists
    all = await repository.getAllMeals();
    expect(all.some((m) => m.id === saved.id)).toBe(false);
  });

  it("logs, retrieves, and deletes body weight entries", async () => {
    const nowIso = new Date().toISOString();
    const entry = await repository.addWeightEntry({
      weightKg: 78.5,
      recordedAt: nowIso,
      notes: "Cân sáng sau thức dậy",
    });

    expect(entry).toBeDefined();
    expect(entry.weightKg).toBe(78.5);

    let history = await repository.getWeightEntries();
    expect(history.some((w) => w.id === entry.id)).toBe(true);

    // Delete entry
    await repository.deleteWeightEntry(entry.id);
    history = await repository.getWeightEntries();
    expect(history.some((w) => w.id === entry.id)).toBe(false);
  });

  it("merges all meals from one date into another date accurately", async () => {
    // Create two meals on Oct 31
    await repository.saveMeal({
      mealType: "lunch",
      eatenAt: "2026-10-30T17:15:00.000Z", // 00:15 Oct 31 VN time
      notes: "Bữa trưa thử nghiệm",
      analysisStatus: "manual",
      items: [{ foodName: "Cơm tấm", portionG: 200, nutrition: { calories: 300, protein: 10, carbs: 50, fat: 5, fiber: 1 } }],
    });
    await repository.saveMeal({
      mealType: "dinner",
      eatenAt: "2026-10-30T18:30:00.000Z", // 01:30 Oct 31 VN time
      notes: "Bữa tối thử nghiệm",
      analysisStatus: "manual",
      items: [{ foodName: "Bún chả", portionG: 250, nutrition: { calories: 400, protein: 20, carbs: 50, fat: 10, fiber: 2 } }],
    });

    const oct31Before = await repository.getMealsForDate("2026-10-31");
    expect(oct31Before.length).toBeGreaterThanOrEqual(2);

    // Merge all meals from Oct 31 to Oct 30
    const count = await repository.mergeMealsToDate("2026-10-31", "2026-10-30");
    expect(count).toBeGreaterThanOrEqual(2);

    // Oct 31 should now have 0 meals!
    const oct31After = await repository.getMealsForDate("2026-10-31");
    expect(oct31After).toHaveLength(0);

    // Oct 30 should now contain all of them!
    const oct30After = await repository.getMealsForDate("2026-10-30");
    expect(oct30After.length).toBeGreaterThanOrEqual(2);
  });

  it("exports all user data as valid JSON", async () => {
    const exportedJson = await repository.exportAllData();
    expect(typeof exportedJson).toBe("string");

    const parsed = JSON.parse(exportedJson);
    expect(parsed.exportedAt).toBeDefined();
    expect(parsed.profile).toBeDefined();
    expect(parsed.goal).toBeDefined();
    expect(Array.isArray(parsed.meals)).toBe(true);
    expect(Array.isArray(parsed.weightEntries)).toBe(true);
  });
});

