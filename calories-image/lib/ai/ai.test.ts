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
});

