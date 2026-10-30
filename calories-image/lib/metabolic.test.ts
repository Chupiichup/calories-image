import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateGlycemicLoad,
  getGiCategory,
  getGlCategory,
  isTimeInMorningWindow,
  getMinutesBetweenMeals,
  evaluateDailySugarStatus,
  resolveItemMetabolicDetails,
  evaluateMealMetabolic,
  DEFAULT_METABOLIC_PREFERENCES,
  type MetabolicPreferences,
} from "./metabolic";
import { repository } from "./db/repository";

describe("Metabolic Nutrition Guardrails Engine", () => {
  describe("GI and GL Calculations", () => {
    it("categorizes Glycemic Index according to international clinical standards", () => {
      expect(getGiCategory(15)).toBe("low");
      expect(getGiCategory(55)).toBe("low");
      expect(getGiCategory(56)).toBe("medium");
      expect(getGiCategory(69)).toBe("medium");
      expect(getGiCategory(70)).toBe("high");
      expect(getGiCategory(85)).toBe("high");
    });

    it("calculates Glycemic Load and categorizes correctly", () => {
      // Cooked white rice: 150g with 42g carbs, GI 73 -> (73 * 42) / 100 = 30.66 (High GL >= 20)
      const resRice = calculateGlycemicLoad(73, 42);
      expect(resRice.gl).toBe(30.7);
      expect(resRice.category).toBe("high");
      expect(getGlCategory(resRice.gl)).toBe("high");

      // Apple: 15g carbs, GI 36 -> (36 * 15) / 100 = 5.4 (Low GL <= 10)
      const resApple = calculateGlycemicLoad(36, 15);
      expect(resApple.gl).toBe(5.4);
      expect(resApple.category).toBe("low");
      expect(getGlCategory(resApple.gl)).toBe("low");

      // Boiled sweet potato: 24g carbs, GI 63 -> (63 * 24) / 100 = 15.1 (Medium GL 11-19)
      const resPotato = calculateGlycemicLoad(63, 24);
      expect(resPotato.gl).toBe(15.1);
      expect(resPotato.category).toBe("medium");
      expect(getGlCategory(resPotato.gl)).toBe("medium");

      // Zero or negative carbs
      expect(calculateGlycemicLoad(70, 0).gl).toBe(0);
      expect(calculateGlycemicLoad(70, -5).gl).toBe(0);
    });
  });

  describe("Distinction between Added Sugar, Natural Sugar, and Refined High-GI Carbs", () => {
    it("distinguishes white rice as high-GI refined carbohydrate with ZERO added sugar", () => {
      const rice = resolveItemMetabolicDetails({
        foodName: "Cơm trắng",
        portionG: 150,
        carbsG: 42,
      });

      expect(rice.sugarClassification).toBe("NO_KNOWN_SUGAR");
      expect(rice.addedSugarG).toBe(0);
      expect(rice.giCategory).toBe("high");
      expect(rice.giValue).toBe(73);
      expect(rice.glValue).toBeGreaterThan(20);
    });

    it("distinguishes plain yogurt as natural sugar (lactose) vs sweetened yogurt as added sugar", () => {
      const plainYogurt = resolveItemMetabolicDetails({
        foodName: "Sữa chua không đường",
        portionG: 100,
        carbsG: 5,
      });
      expect(plainYogurt.sugarClassification).toBe("NATURAL_SUGAR");
      expect(plainYogurt.addedSugarG).toBe(0);

      const sweetYogurt = resolveItemMetabolicDetails({
        foodName: "Sữa chua có đường",
        portionG: 100,
        carbsG: 15,
      });
      expect(sweetYogurt.sugarClassification).toBe("BOTH_NATURAL_AND_ADDED");
      expect(sweetYogurt.addedSugarG).toBeGreaterThan(0);
    });

    it("identifies fruit juice as free/added sugar compared to whole fruit", () => {
      const wholeOrange = resolveItemMetabolicDetails({
        foodName: "Cam tươi",
        portionG: 150,
        carbsG: 18,
      });
      expect(wholeOrange.sugarClassification).toBe("NATURAL_SUGAR");
      expect(wholeOrange.addedSugarG).toBe(0);

      const orangeJuice = resolveItemMetabolicDetails({
        foodName: "Nước cam vắt thêm đường",
        portionG: 200,
        carbsG: 26,
      });
      expect(["ADDED_SUGAR", "BOTH_NATURAL_AND_ADDED"]).toContain(orangeJuice.sugarClassification);
      expect(orangeJuice.addedSugarG).toBeGreaterThan(0);
    });

    it("flags condensed milk coffee for pre-save clarification", () => {
      const milkCoffee = resolveItemMetabolicDetails({
        foodName: "Cà phê sữa đá",
        portionG: 180,
        carbsG: 22,
      });

      expect(milkCoffee.sugarClassification).toBe("BOTH_NATURAL_AND_ADDED");
      expect(milkCoffee.addedSugarG).toBeGreaterThan(10);
      expect(milkCoffee.clarificationQuestion).toBeDefined();
    });
  });

  describe("Morning Window and High-GI Breakfast Logic", () => {
    it("accurately detects morning hours (05:00 - 10:00) in Vietnam local time", () => {
      // 08:00 Vietnam time (01:00 UTC) -> Morning
      expect(isTimeInMorningWindow("2026-10-31T01:00:00.000Z")).toBe(true);

      // 06:30 Vietnam time (23:30 UTC previous day) -> Morning
      expect(isTimeInMorningWindow("2026-10-30T23:30:00.000Z")).toBe(true);

      // 12:30 Vietnam time (05:30 UTC) -> Lunch (Not morning)
      expect(isTimeInMorningWindow("2026-10-31T05:30:00.000Z")).toBe(false);

      // 19:30 Vietnam time (12:30 UTC) -> Dinner (Not morning)
      expect(isTimeInMorningWindow("2026-10-31T12:30:00.000Z")).toBe(false);
    });

    it("warns when breakfast contains high-GI refined carbs eaten during morning fasting break", () => {
      const evaluation = evaluateMealMetabolic({
        mealType: "breakfast",
        eatenAtIso: "2026-10-31T01:00:00.000Z", // 08:00 VN
        items: [
          {
            name: "Bánh mì trắng",
            carbsG: 50,
            portionG: 100,
            giValue: 75,
            giCategory: "high",
            glValue: 37.5,
            glCategory: "high",
            sugarClassification: "NO_KNOWN_SUGAR",
            addedSugarG: 0,
          },
        ],
        priorDailyAddedSugarG: 0,
        preferences: DEFAULT_METABOLIC_PREFERENCES,
      });

      const morningWarning = evaluation.warnings.find(
        (w) => w.type === "morning_high_gi" || w.id === "morning_high_gi_warning",
      );
      expect(morningWarning).toBeDefined();
      expect(morningWarning?.title).toContain("Bữa sáng");
      expect(evaluation.constructiveAlternatives.length).toBeGreaterThan(0);
    });
  });

  describe("Meal Interval and Snack Frequency", () => {
    it("calculates elapsed minutes between meals correctly", () => {
      const meal1 = "2026-10-31T05:00:00.000Z"; // 12:00 VN
      const meal2 = "2026-10-31T06:30:00.000Z"; // 13:30 VN
      expect(getMinutesBetweenMeals(meal2, meal1)).toBe(90);
    });

    it("issues a spacing note when consecutive meals occur under configured minimum interval", () => {
      const evaluation = evaluateMealMetabolic({
        mealType: "snack",
        eatenAtIso: "2026-10-31T06:30:00.000Z", // 90 min after previous
        items: [
          {
            name: "Bánh quy bơ",
            carbsG: 20,
            portionG: 30,
            sugarClassification: "ADDED_SUGAR",
            addedSugarG: 8,
          },
        ],
        priorDailyAddedSugarG: 0,
        previousMealEatenAtIso: "2026-10-31T05:00:00.000Z",
        preferences: {
          ...DEFAULT_METABOLIC_PREFERENCES,
          minMealIntervalMinutes: 180, // 3 hours
        },
      });

      const spacingWarning = evaluation.warnings.find(
        (w) => w.type === "meal_spacing" || w.id === "meal_spacing_short",
      );
      expect(spacingWarning).toBeDefined();
    });

    it("flags frequent snacking when snack count exceeds 2 in a day", () => {
      const evaluation = evaluateMealMetabolic({
        mealType: "snack",
        eatenAtIso: "2026-10-31T08:00:00.000Z",
        items: [
          {
            name: "Hạt điều",
            carbsG: 8,
            portionG: 30,
            sugarClassification: "NO_KNOWN_SUGAR",
            addedSugarG: 0,
          },
        ],
        priorDailyAddedSugarG: 0,
        todaySnackCount: 2, // This is the 3rd snack
        preferences: DEFAULT_METABOLIC_PREFERENCES,
      });

      const snackWarning = evaluation.warnings.find(
        (w) => w.type === "frequent_snacking" || w.id === "frequent_snacking",
      );
      expect(snackWarning).toBeDefined();
    });
  });

  describe("Cumulative Daily Added Sugar Thresholds", () => {
    it("evaluates daily added sugar progression (NORMAL -> APPROACHING -> EXCEEDED)", () => {
      expect(evaluateDailySugarStatus(10, 25)).toBe("NORMAL");
      expect(evaluateDailySugarStatus(20, 25)).toBe("APPROACHING");
      expect(evaluateDailySugarStatus(25, 25)).toBe("EXCEEDED");
      expect(evaluateDailySugarStatus(32, 25)).toBe("EXCEEDED");
    });

    it("raises HIGH_CONCERN when this meal causes cumulative added sugar to exceed daily target", () => {
      const evaluation = evaluateMealMetabolic({
        mealType: "snack",
        eatenAtIso: "2026-10-31T08:00:00.000Z",
        items: [
          {
            name: "Trà sữa trân châu",
            carbsG: 50,
            portionG: 350,
            sugarClassification: "ADDED_SUGAR",
            addedSugarG: 18,
          },
        ],
        priorDailyAddedSugarG: 15, // Total becomes 33g > 25g
        preferences: DEFAULT_METABOLIC_PREFERENCES,
      });

      expect(evaluation.newProjectedDailyAddedSugarG).toBe(33);
      expect(evaluation.cumulativeAddedSugarStatus).toBe("EXCEEDED");
      expect(evaluation.riskSeverity).toBe("HIGH_CONCERN");
      expect(evaluation.warnings.some((w) => w.id === "exceeded_daily_added_sugar" || w.type === "added_sugar")).toBe(true);
    });
  });

  describe("Strictness Modes (Gentle, Balanced, Strict)", () => {
    const mealWithModerateSugar = {
      mealType: "snack" as const,
      eatenAtIso: "2026-10-31T07:00:00.000Z",
      items: [
        {
          name: "Sữa chua có đường",
          carbsG: 12,
          portionG: 100,
          sugarClassification: "BOTH_NATURAL_AND_ADDED" as const,
          addedSugarG: 6,
        },
      ],
      priorDailyAddedSugarG: 5,
    };

    it("in gentle mode: does not alarm on small sugar amounts within daily limit", () => {
      const evalGentle = evaluateMealMetabolic({
        ...mealWithModerateSugar,
        preferences: {
          ...DEFAULT_METABOLIC_PREFERENCES,
          strictness: "gentle",
        },
      });

      expect(evalGentle.riskSeverity).toBe("LOW_CONCERN");
    });

    it("in strict mode: flags any added sugar immediately as CAUTION or HIGH_CONCERN", () => {
      const evalStrict = evaluateMealMetabolic({
        ...mealWithModerateSugar,
        preferences: {
          ...DEFAULT_METABOLIC_PREFERENCES,
          strictness: "strict",
        },
      });

      expect(["CAUTION", "HIGH_CONCERN"]).toContain(evalStrict.riskSeverity);
    });
  });

  describe("Repository Integration and Preference Persistence", () => {
    it("returns default preferences when not previously configured", async () => {
      const prefs = await repository.getMetabolicPreferences();
      expect(prefs).toBeDefined();
      expect(prefs.dailyAddedSugarLimitG).toBe(25);
      expect(prefs.strictness).toBe("balanced");
    });

    it("persists updated metabolic preferences cleanly", async () => {
      const updated: MetabolicPreferences = {
        enabled: true,
        strictness: "strict",
        focusFattyLiver: true,
        focusHighInsulin: true,
        dailyAddedSugarLimitG: 20,
        warnMorningHighGi: true,
        minMealIntervalMinutes: 240,
        showAlternatives: true,
      };

      await repository.saveMetabolicPreferences(updated);
      const retrieved = await repository.getMetabolicPreferences();

      expect(retrieved.strictness).toBe("strict");
      expect(retrieved.dailyAddedSugarLimitG).toBe(20);
      expect(retrieved.minMealIntervalMinutes).toBe(240);
    });
  });
});
