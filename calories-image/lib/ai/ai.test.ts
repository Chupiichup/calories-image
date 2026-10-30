import { describe, expect, it } from "vitest";
import { MockVisionProvider } from "./mockProvider";
import { MealAnalysisResponseSchema } from "./types";

describe("AI Vision Layer", () => {
  it("MockVisionProvider returns valid schema for general food photo", async () => {
    const provider = new MockVisionProvider();
    const result = await provider.analyzeFoodImage({
      imageBase64: "fake_base64_data",
      mimeType: "image/jpeg",
    });

    const validated = MealAnalysisResponseSchema.parse(result);
    expect(validated.candidates.length).toBeGreaterThanOrEqual(1);
    expect(validated.confidenceOverall).toBeGreaterThan(0.7);

    // Check macros exist and are non-negative
    const chicken = validated.candidates.find((c) => c.name.includes("Ức gà"));
    expect(chicken).toBeDefined();
    if (chicken) {
      expect(chicken.protein).toBeGreaterThan(30);
      expect(chicken.portionG).toBeGreaterThan(0);
    }
  });

  it("MockVisionProvider detects Vietnamese noodle soup when hinted in note", async () => {
    const provider = new MockVisionProvider();
    const result = await provider.analyzeFoodImage({
      imageBase64: "fake_base64_data",
      mimeType: "image/jpeg",
      userNote: "Bát phở bò tái chín ăn sáng",
    });

    expect(result.mealTypeInferred).toBe("breakfast");
    const pho = result.candidates.find((c) => c.name.includes("Phở bò"));
    expect(pho).toBeDefined();
    expect(pho?.ingredients).toContain("Thịt bò nạc");
  });

  it("MockVisionProvider identifies banh mi properly", async () => {
    const provider = new MockVisionProvider();
    const result = await provider.analyzeFoodImage({
      imageBase64: "fake_base64_data",
      mimeType: "image/jpeg",
      userNote: "bánh mì thịt",
    });

    expect(result.candidates.some((c) => c.name.includes("Bánh mì"))).toBe(true);
  });

  describe("benchmark dishes nutritional reference intervals", () => {
    const provider = new MockVisionProvider();

    it("verifies Com Tam Suon Trung benchmark metrics", async () => {
      const result = await provider.analyzeFoodImage({
        imageBase64: "data",
        mimeType: "image/jpeg",
        userNote: "Cơm tấm sườn trứng nướng",
      });
      const validated = MealAnalysisResponseSchema.parse(result);
      const totalCalories = validated.candidates.reduce((s, c) => s + c.calories, 0);
      const totalProtein = validated.candidates.reduce((s, c) => s + c.protein, 0);
      const totalPortion = validated.candidates.reduce((s, c) => s + c.portionG, 0);

      // Benchmark BM-03: Portion 350-500g, Calories 620-950, Protein 28-45g
      expect(totalPortion).toBeGreaterThanOrEqual(350);
      expect(totalPortion).toBeLessThanOrEqual(500);
      expect(totalCalories).toBeGreaterThanOrEqual(620);
      expect(totalCalories).toBeLessThanOrEqual(950);
      expect(totalProtein).toBeGreaterThanOrEqual(28);
      expect(totalProtein).toBeLessThanOrEqual(45);
    });

    it("verifies Bun Cha Ha Noi benchmark metrics", async () => {
      const result = await provider.analyzeFoodImage({
        imageBase64: "data",
        mimeType: "image/jpeg",
        userNote: "Bún chả Hà Nội nướng than",
      });
      const validated = MealAnalysisResponseSchema.parse(result);
      const totalCalories = validated.candidates.reduce((s, c) => s + c.calories, 0);
      const totalPortion = validated.candidates.reduce((s, c) => s + c.portionG, 0);

      // Benchmark BM-04: Portion 380-520g, Calories 500-780
      expect(totalPortion).toBeGreaterThanOrEqual(380);
      expect(totalPortion).toBeLessThanOrEqual(520);
      expect(totalCalories).toBeGreaterThanOrEqual(500);
      expect(totalCalories).toBeLessThanOrEqual(780);
    });

    it("verifies Bun Dau Mam Tom benchmark metrics", async () => {
      const result = await provider.analyzeFoodImage({
        imageBase64: "data",
        mimeType: "image/jpeg",
        userNote: "Bún đậu mắm tôm thập cẩm",
      });
      const validated = MealAnalysisResponseSchema.parse(result);
      const totalCalories = validated.candidates.reduce((s, c) => s + c.calories, 0);
      const totalProtein = validated.candidates.reduce((s, c) => s + c.protein, 0);

      // Benchmark BM-05: Calories 600-950, Protein 28-45g
      expect(totalCalories).toBeGreaterThanOrEqual(600);
      expect(totalCalories).toBeLessThanOrEqual(950);
      expect(totalProtein).toBeGreaterThanOrEqual(28);
    });

    it("verifies Banh Xeo benchmark metrics", async () => {
      const result = await provider.analyzeFoodImage({
        imageBase64: "data",
        mimeType: "image/jpeg",
        userNote: "Bánh xèo miền Tây tôm thịt",
      });
      const validated = MealAnalysisResponseSchema.parse(result);
      const totalCalories = validated.candidates.reduce((s, c) => s + c.calories, 0);

      // Benchmark BM-07: Calories 420-680
      expect(totalCalories).toBeGreaterThanOrEqual(420);
      expect(totalCalories).toBeLessThanOrEqual(680);
    });

    it("verifies Trung Vit Lon benchmark metrics", async () => {
      const result = await provider.analyzeFoodImage({
        imageBase64: "data",
        mimeType: "image/jpeg",
        userNote: "Trứng vịt lộn luộc",
      });
      const validated = MealAnalysisResponseSchema.parse(result);
      const totalCalories = validated.candidates.reduce((s, c) => s + c.calories, 0);
      const totalProtein = validated.candidates.reduce((s, c) => s + c.protein, 0);

      // Benchmark BM-10: Calories 180-360, Protein 13-26g
      expect(totalCalories).toBeGreaterThanOrEqual(180);
      expect(totalCalories).toBeLessThanOrEqual(360);
      expect(totalProtein).toBeGreaterThanOrEqual(13);
      expect(totalProtein).toBeLessThanOrEqual(26);
    });
  });
});

