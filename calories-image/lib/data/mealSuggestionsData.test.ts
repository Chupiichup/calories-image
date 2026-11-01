import { describe, it, expect } from "vitest";
import {
  getCurrentMealTimeCategory,
  getPersonalizedDishScore,
  filterAndSortDishes,
  SUGGESTED_DISHES,
  MEAL_CATEGORY_INFO,
} from "./mealSuggestionsData";

describe("Meal Suggestions Data & Logic", () => {
  it("determines correct meal time category according to Vietnam local time (UTC+7)", () => {
    // 08:00 Vietnam time (UTC 01:00) -> Breakfast
    const morning = new Date("2026-10-31T01:00:00.000Z");
    expect(getCurrentMealTimeCategory(morning)).toBe("breakfast");

    // 12:30 Vietnam time (UTC 05:30) -> Lunch
    const midday = new Date("2026-10-31T05:30:00.000Z");
    expect(getCurrentMealTimeCategory(midday)).toBe("lunch");

    // 15:30 Vietnam time (UTC 08:30) -> Afternoon
    const afternoon = new Date("2026-10-31T08:30:00.000Z");
    expect(getCurrentMealTimeCategory(afternoon)).toBe("afternoon");

    // 19:00 Vietnam time (UTC 12:00) -> Dinner
    const evening = new Date("2026-10-31T12:00:00.000Z");
    expect(getCurrentMealTimeCategory(evening)).toBe("dinner");

    // 22:30 Vietnam time (UTC 15:30) -> Snack
    const night = new Date("2026-10-31T15:30:00.000Z");
    expect(getCurrentMealTimeCategory(night)).toBe("snack");
  });

  it("contains rich dishes across all 5 meal categories", () => {
    const categories = ["breakfast", "lunch", "afternoon", "dinner", "snack"] as const;
    for (const cat of categories) {
      const dishes = SUGGESTED_DISHES.filter((d) => d.category === cat);
      expect(dishes.length).toBeGreaterThanOrEqual(4);
      expect(MEAL_CATEGORY_INFO[cat]).toBeDefined();
    }
  });

  it("ensures each dish has valid clinical nutrition and ingredients", () => {
    for (const dish of SUGGESTED_DISHES) {
      expect(dish.name.length).toBeGreaterThan(0);
      expect(dish.ingredients.length).toBeGreaterThan(0);
      expect(dish.calories).toBeGreaterThan(0);
      expect(dish.protein).toBeGreaterThanOrEqual(0);
      expect(dish.carbohydrates).toBeGreaterThanOrEqual(0);
      expect(dish.fat).toBeGreaterThanOrEqual(0);
      expect(dish.prepTimeMinutes).toBeGreaterThan(0);
      expect(dish.instructions.length).toBeGreaterThan(0);
      expect(dish.suitabilityNotes.length).toBeGreaterThan(0);
    }
  });

  it("calculates higher personalization scores for high protein & metabolic friendly meals", () => {
    const highProteinMeal = SUGGESTED_DISHES.find((d) => d.protein >= 35)!;
    const res = getPersonalizedDishScore(
      highProteinMeal,
      null,
      { dailyCalorieTarget: 1600, proteinG: 140 } as any,
      {
        enabled: true,
        fattyLiverConsideration: true,
        highInsulinConsideration: true,
        addedSugarMonitoringEnabled: true,
      } as any,
    );

    expect(res.score).toBeGreaterThanOrEqual(80);
    expect(res.matchReasons.length).toBeGreaterThan(0);
  });

  it("filters and sorts correctly by protein, quick prep and calories", () => {
    const lunchDishes = filterAndSortDishes({
      dishes: SUGGESTED_DISHES,
      category: "lunch",
      filterOption: "high_protein",
      sortOption: "highest_protein",
    });

    expect(lunchDishes.length).toBeGreaterThan(0);
    expect(lunchDishes[0].protein).toBeGreaterThanOrEqual(lunchDishes[1].protein);

    const quickBreakfast = filterAndSortDishes({
      dishes: SUGGESTED_DISHES,
      category: "breakfast",
      filterOption: "quick_prep",
      sortOption: "fastest_prep",
    });

    expect(quickBreakfast.length).toBeGreaterThan(0);
    expect(quickBreakfast.every((d) => d.prepTimeMinutes <= 10)).toBe(true);
  });
});

