import { describe, expect, it } from "vitest";

import {
  calculateBmi,
  calculateBmr,
  calculateCalorieTarget,
  calculateComprehensiveTargets,
  calculateMacroTargets,
  calculateTdee,
  calculateWeightTrend,
  scaleNutritionValues,
  sumMealItems,
  validateAiMealCandidate,
  validateAiMealResponse,
} from "./nutrition";

describe("nutrition calculations engine", () => {
  it("calculates BMI correctly with Asian classification", () => {
    const normal = calculateBmi(65, 170);
    expect(normal.bmi).toBe(22.5);
    expect(normal.category).toBe("Bình thường (Tiêu chuẩn châu Á)");

    const overweight = calculateBmi(75, 170);
    expect(overweight.bmi).toBe(26.0);
    expect(overweight.category).toBe("Béo phì độ I");
  });

  it("calculates Mifflin-St Jeor BMR for male and female users", () => {
    // Male: 10*75 + 6.25*175 - 5*30 + 5 = 750 + 1093.75 - 150 + 5 = 1698.75 -> 1699
    const maleBmr = calculateBmr({ weightKg: 75, heightCm: 175, ageYears: 30, sex: "male" });
    expect(maleBmr).toBe(1699);

    // Female: 10*55 + 6.25*160 - 5*28 - 161 = 550 + 1000 - 140 - 161 = 1249
    const femaleBmr = calculateBmr({ weightKg: 55, heightCm: 160, ageYears: 28, sex: "female" });
    expect(femaleBmr).toBe(1249);
  });

  it("calculates TDEE using correct physical activity multipliers", () => {
    const tdeeModerate = calculateTdee({ bmr: 1699, activityLevel: "moderate" });
    // 1699 * 1.55 = 2633.45 -> 2633
    expect(tdeeModerate).toBe(2633);

    const tdeeSedentary = calculateTdee({ bmr: 1699, activityLevel: "sedentary" });
    // 1699 * 1.2 = 2038.8 -> 2039
    expect(tdeeSedentary).toBe(2039);
  });

  it("calculates safe muscle-sparing targets with comprehensive safety checks", () => {
    const result = calculateComprehensiveTargets(
      {
        weightKg: 75,
        heightCm: 175,
        ageYears: 30,
        sex: "male",
        activityLevel: "moderate",
      },
      "moderate",
    );

    // 20% deficit of 2633 = ~527 kcal deficit -> 2106 kcal target
    expect(result.calorieTarget).toBeGreaterThanOrEqual(1400);
    expect(result.deficitKcal).toBeGreaterThan(0);
    expect(result.macros.protein).toBeGreaterThanOrEqual(135); // at least 1.8g/kg
    expect(result.macros.fat).toBeGreaterThanOrEqual(50);
    expect(result.macros.fiber).toBeGreaterThanOrEqual(25);
    expect(result.warnings.length).toBe(0);
  });

  it("triggers safety warnings for pregnant or under-18 users", () => {
    const pregnantResult = calculateComprehensiveTargets(
      {
        weightKg: 60,
        heightCm: 162,
        ageYears: 27,
        sex: "female",
        activityLevel: "light",
        isPregnantOrNursing: true,
      },
      "moderate",
    );
    expect(pregnantResult.warnings.some((w) => w.includes("mang thai"))).toBe(true);

    const youthResult = calculateComprehensiveTargets(
      {
        weightKg: 65,
        heightCm: 170,
        ageYears: 16,
        sex: "male",
        activityLevel: "moderate",
        isUnder18: true,
      },
      "slow",
    );
    expect(youthResult.warnings.some((w) => w.includes("dưới 18 tuổi"))).toBe(true);
  });

  it("scales nutrition values proportionally", () => {
    const scaled = scaleNutritionValues({
      values: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4 },
      portionG: 200,
      referenceG: 100,
    });

    expect(scaled.calories).toBe(260);
    expect(scaled.protein).toBe(5.4);
    expect(scaled.carbs).toBe(56.4);
    expect(scaled.fat).toBe(0.6);
    expect(scaled.fiber).toBe(0.8);
  });

  it("sums meal items accurately without losing precision", () => {
    const total = sumMealItems([
      { nutrition: { calories: 260, protein: 5.4, carbs: 56.4, fat: 0.6, fiber: 0.8 } },
      { nutrition: { calories: 247.5, protein: 46.5, carbs: 0, fat: 5.4, fiber: 0 } },
      { nutrition: { calories: 34.5, protein: 3.9, carbs: 4.65, fat: 0.45, fiber: 1.5 } },
    ]);

    expect(total.calories).toBe(542);
    expect(total.protein).toBe(55.8);
    expect(total.carbs).toBe(61.1);
    expect(total.fat).toBe(6.5);
    expect(total.fiber).toBe(2.3);
  });

  it("calculates weight trend and weekly change rate", () => {
    const trend = calculateWeightTrend([
      { recordedAt: "2026-10-01T08:00:00Z", weightKg: 76.5 },
      { recordedAt: "2026-10-08T08:00:00Z", weightKg: 75.8 },
      { recordedAt: "2026-10-15T08:00:00Z", weightKg: 75.2 },
    ]);

    expect(trend.latest).toBe(75.2);
    expect(trend.previous).toBe(75.8);
    expect(trend.changeKg).toBe(-0.6);
    expect(trend.direction).toBe("down");
    expect(trend.weeklyRateKg).toBeLessThan(0);
  });

  it("validates AI meal candidate and handles missing values safely", () => {
    const validated = validateAiMealCandidate({
      name: "Phở bò",
      portionG: 500,
      calories: 425,
      protein: 25,
      carbs: 55,
      fat: 11,
      fiber: 2,
      confidence: 0.92,
    });

    expect(validated.name).toBe("Phở bò");
    expect(validated.confidence).toBe(0.92);
    expect(validated.portionG).toBe(500);
  });

  it("rejects invalid AI responses without items or with negative portions", () => {
    expect(() => validateAiMealResponse({ candidates: [] })).toThrow();
    expect(() =>
      validateAiMealCandidate({
        name: "",
        portionG: 100,
        calories: 100,
        protein: 10,
        carbs: 10,
        fat: 2,
        fiber: 1,
        confidence: 0.5,
      }),
    ).toThrow();
    expect(() =>
      validateAiMealCandidate({
        name: "Cơm",
        portionG: -50,
        calories: 100,
        protein: 10,
        carbs: 10,
        fat: 2,
        fiber: 1,
        confidence: 0.5,
      }),
    ).toThrow();
  });

  describe("boundary conditions and edge cases", () => {
    it("protects against extreme deficit crash diets with female safety floor (1200 kcal)", () => {
      // Petite sedentary female: 45kg, 150cm, 35 years old
      const result = calculateComprehensiveTargets(
        {
          weightKg: 45,
          heightCm: 150,
          ageYears: 35,
          sex: "female",
          activityLevel: "sedentary",
        },
        "aggressive",
      );

      // Raw 25% deficit would be below 1000 kcal, but safety floor MUST clamp at >= 1200 kcal
      expect(result.calorieTarget).toBeGreaterThanOrEqual(1200);
      expect(result.calorieTarget).toBeLessThanOrEqual(result.tdee);
      expect(result.macros.protein).toBeGreaterThanOrEqual(75); // minimum protein protection
    });

    it("protects against crash diets with male safety floor (1400 kcal)", () => {
      // Very light sedentary male: 50kg, 160cm, 40 years old
      const result = calculateComprehensiveTargets(
        {
          weightKg: 50,
          heightCm: 160,
          ageYears: 40,
          sex: "male",
          activityLevel: "sedentary",
        },
        "aggressive",
      );

      expect(result.calorieTarget).toBeGreaterThanOrEqual(1400);
      expect(result.macros.protein).toBeGreaterThanOrEqual(100);
    });

    it("handles prefer_not_to_say biological sex using midpoint BMR", () => {
      const maleBmr = calculateBmr({ weightKg: 70, heightCm: 170, ageYears: 30, sex: "male" });
      const femaleBmr = calculateBmr({ weightKg: 70, heightCm: 170, ageYears: 30, sex: "female" });
      const neutralBmr = calculateBmr({ weightKg: 70, heightCm: 170, ageYears: 30, sex: "prefer_not_to_say" });

      expect(neutralBmr).toBeGreaterThan(femaleBmr);
      expect(neutralBmr).toBeLessThan(maleBmr);
      // Midpoint: (base + 5 + base - 161) / 2 = base - 78
      expect(Math.abs(neutralBmr - (maleBmr + femaleBmr) / 2)).toBeLessThanOrEqual(2);
    });

    it("rejects non-positive numbers in BMR calculation", () => {
      expect(() => calculateBmr({ weightKg: -70, heightCm: 170, ageYears: 30, sex: "male" })).toThrow();
      expect(() => calculateBmr({ weightKg: 70, heightCm: 0, ageYears: 30, sex: "male" })).toThrow();
      expect(() => calculateBmr({ weightKg: 70, heightCm: 170, ageYears: -5, sex: "male" })).toThrow();
      expect(() => calculateBmr({ weightKg: NaN, heightCm: 170, ageYears: 30, sex: "male" })).toThrow();
    });

    it("evaluates high-weight users safely without overflow", () => {
      const heavyResult = calculateComprehensiveTargets(
        {
          weightKg: 180,
          heightCm: 185,
          ageYears: 45,
          sex: "male",
          activityLevel: "light",
        },
        "moderate",
      );

      expect(heavyResult.bmi).toBeGreaterThan(40);
      expect(heavyResult.bmiCategory).toBe("Béo phì độ II");
      expect(heavyResult.calorieTarget).toBeGreaterThan(2000);
      expect(heavyResult.macros.protein).toBe(360); // 180kg * 2.0g
    });

    it("evaluates all weight loss pace tiers correctly", () => {
      const baseInput = {
        weightKg: 80,
        heightCm: 175,
        ageYears: 30,
        sex: "male" as const,
        activityLevel: "moderate" as const,
      };

      const slow = calculateComprehensiveTargets(baseInput, "slow");
      const moderate = calculateComprehensiveTargets(baseInput, "moderate");
      const aggressive = calculateComprehensiveTargets(baseInput, "aggressive");

      expect(slow.calorieTarget).toBeGreaterThan(moderate.calorieTarget);
      expect(moderate.calorieTarget).toBeGreaterThan(aggressive.calorieTarget);
      expect(slow.deficitPercent).toBe(15);
      expect(moderate.deficitPercent).toBe(20);
      expect(aggressive.deficitPercent).toBe(25);
    });
  });
});
