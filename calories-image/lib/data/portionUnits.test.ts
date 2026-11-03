import { describe, it, expect } from "vitest";
import {
  resolveFoodPortionUnits,
  getDefaultUnitOption,
  calculateInitialPortionState,
  getFoodPortionBadgeText,
} from "./portionUnits";

describe("portionUnits helper", () => {
  it("resolves cucumber (dưa chuột / dưa leo) to natural unit 'quả' with ~200g standard", () => {
    const units = resolveFoodPortionUnits("Dưa leo (dưa chuột) tươi");
    expect(units.length).toBeGreaterThan(1);

    const defaultUnit = getDefaultUnitOption(units);
    expect(defaultUnit.unitName).toBe("quả");
    expect(defaultUnit.gramsPerUnit).toBe(200);

    // Has 'g' option as fallback
    const gUnit = units.find((u) => u.isGramUnit);
    expect(gUnit).toBeDefined();
    expect(gUnit?.gramsPerUnit).toBe(1);
  });

  it("calculates initial portion state for cucumber as 1 quả = 200g", () => {
    const state = calculateInitialPortionState("Dưa leo (dưa chuột) tươi");
    expect(state.selectedUnit.unitName).toBe("quả");
    expect(state.unitQuantity).toBe(1);
    expect(state.portionG).toBe(200);
  });

  it("accurately handles fractional portions: 0.1 quả, 0.5 quả, 1.5 quả", () => {
    const state = calculateInitialPortionState("Dưa leo (dưa chuột) tươi");
    const gramsPerUnit = state.selectedUnit.gramsPerUnit; // 200g

    // 0.5 quả dưa chuột = 100g
    expect(0.5 * gramsPerUnit).toBe(100);

    // 0.1 quả dưa chuột = 20g
    expect(0.1 * gramsPerUnit).toBe(20);

    // 1.5 quả dưa chuột = 300g
    expect(1.5 * gramsPerUnit).toBe(300);
  });

  it("resolves rice (cơm trắng) to 'bát ăn cơm' (~150g)", () => {
    const units = resolveFoodPortionUnits("Cơm trắng (nấu chín)");
    const defaultUnit = getDefaultUnitOption(units);
    expect(defaultUnit.unitName).toBe("bát ăn cơm");
    expect(defaultUnit.gramsPerUnit).toBe(150);
  });

  it("resolves eggs (trứng gà luộc) to 'quả' (~55g)", () => {
    const units = resolveFoodPortionUnits("Trứng gà luộc");
    const defaultUnit = getDefaultUnitOption(units);
    expect(defaultUnit.unitName).toBe("quả");
    expect(defaultUnit.gramsPerUnit).toBe(55);
  });

  it("resolves sweet potato (khoai lang) to 'củ' (~150g)", () => {
    const units = resolveFoodPortionUnits("Khoai lang luộc / hấp");
    const defaultUnit = getDefaultUnitOption(units);
    expect(defaultUnit.unitName).toBe("củ");
    expect(defaultUnit.gramsPerUnit).toBe(150);
  });

  it("resolves bread (bánh mì) to 'cái / ổ' (~90g)", () => {
    const units = resolveFoodPortionUnits("Bánh mì không (bánh mì trắng)");
    const defaultUnit = getDefaultUnitOption(units);
    expect(["cái / ổ", "ổ", "cái"]).toContain(defaultUnit.unitName);
    expect(defaultUnit.gramsPerUnit).toBe(90);
  });

  it("formats badge text showing natural unit for search results", () => {
    const badgeText = getFoodPortionBadgeText({
      name: "Dưa leo (dưa chuột) tươi",
      defaultPortionG: 200,
    });
    expect(badgeText).toContain("quả");
    expect(badgeText).toContain("200g");
  });

  it("falls back to grams for pure weight items like raw minced meat", () => {
    const state = calculateInitialPortionState("Thịt bò xay", undefined, 150);
    expect(state.selectedUnit.isGramUnit).toBe(true);
    expect(state.unitQuantity).toBe(150);
    expect(state.portionG).toBe(150);
  });
});
