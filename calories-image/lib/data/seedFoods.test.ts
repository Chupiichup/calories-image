import { describe, it, expect } from "vitest";
import { searchFoods, removeVietnameseTones, SEED_FOODS } from "./seedFoods";

describe("seedFoods and searchFoods", () => {
  it("removes Vietnamese tones accurately", () => {
    expect(removeVietnameseTones("Cà phê đen đá không đường")).toBe("ca phe den da khong duong");
    expect(removeVietnameseTones("Bún chả Hà Nội")).toBe("bun cha ha noi");
    expect(removeVietnameseTones("Đậu phụ rán")).toBe("dau phu ran");
  });

  it("finds unsweetened black coffee with various query formats", () => {
    const res1 = searchFoods("cà phê");
    expect(res1.length).toBeGreaterThan(0);
    expect(res1.some((f) => f.id === "food-coffee-black-unsweetened")).toBe(true);

    const res2 = searchFoods("ca phe");
    expect(res2.some((f) => f.id === "food-coffee-black-unsweetened")).toBe(true);

    const res3 = searchFoods("ca phe khong duong");
    expect(res3.length).toBeGreaterThan(0);
    expect(res3[0].id).toBe("food-coffee-black-unsweetened");

    const res4 = searchFoods("cà phê không đường");
    expect(res4.length).toBeGreaterThan(0);
    expect(res4[0].id).toBe("food-coffee-black-unsweetened");

    const res5 = searchFoods("den da");
    expect(res5.some((f) => f.name.includes("Cà phê đen"))).toBe(true);

    const res6 = searchFoods("cf");
    expect(res6.some((f) => f.name.includes("Cà phê"))).toBe(true);
  });

  it("finds traditional and everyday Vietnamese dishes", () => {
    expect(searchFoods("pho bo").length).toBeGreaterThan(0);
    expect(searchFoods("bun cha").length).toBeGreaterThan(0);
    expect(searchFoods("com tam").length).toBeGreaterThan(0);
    expect(searchFoods("uc ga").length).toBeGreaterThan(0);
    expect(searchFoods("tra sua").length).toBeGreaterThan(0);
    expect(searchFoods("tra da").length).toBeGreaterThan(0);
    expect(searchFoods("nuoc cam").length).toBeGreaterThan(0);
    expect(searchFoods("sua chua").length).toBeGreaterThan(0);
  });

  it("finds everyday raw cooking ingredients (mướp, lạc sống, sườn, rau củ quả, gia vị)", () => {
    // Mướp
    const muopRes = searchFoods("mướp");
    expect(muopRes.length).toBeGreaterThan(0);
    expect(muopRes.some((f) => f.id === "food-muop-huong")).toBe(true);

    const muopResUnaccented = searchFoods("muop");
    expect(muopResUnaccented.length).toBeGreaterThan(0);
    expect(muopResUnaccented.some((f) => f.id === "food-muop-huong")).toBe(true);

    // Lạc sống
    const lacRes = searchFoods("lạc sống");
    expect(lacRes.length).toBeGreaterThan(0);
    expect(lacRes.some((f) => f.id === "food-lac-song")).toBe(true);

    const lacResUnaccented = searchFoods("lac song");
    expect(lacResUnaccented.length).toBeGreaterThan(0);
    expect(lacResUnaccented.some((f) => f.id === "food-lac-song")).toBe(true);

    // Sườn
    const suonRes = searchFoods("sườn");
    expect(suonRes.length).toBeGreaterThan(0);
    expect(suonRes.some((f) => f.id === "food-suon-non-heo")).toBe(true);

    const suonResUnaccented = searchFoods("suon");
    expect(suonResUnaccented.length).toBeGreaterThan(0);
    expect(suonResUnaccented.some((f) => f.id === "food-suon-non-heo")).toBe(true);

    // Other staple raw ingredients
    expect(searchFoods("rau ngot").some((f) => f.id === "food-rau-ngot-tuoi")).toBe(true);
    expect(searchFoods("mong toi").some((f) => f.id === "food-rau-mong-toi")).toBe(true);
    expect(searchFoods("su su").some((f) => f.id === "food-su-su-tuoi")).toBe(true);
    expect(searchFoods("su hao").some((f) => f.id === "food-su-hao-tuoi")).toBe(true);
    expect(searchFoods("dau an").some((f) => f.id === "food-dau-an-thuc-vat")).toBe(true);
    expect(searchFoods("mo heo").some((f) => f.id === "food-mo-heo")).toBe(true);
  });

  it("has valid non-zero portions and verified nutrition for all items", () => {
    expect(SEED_FOODS.length).toBeGreaterThan(50);
    for (const item of SEED_FOODS) {
      expect(item.defaultPortionG).toBeGreaterThan(0);
      expect(item.caloriesPer100g).toBeGreaterThanOrEqual(0);
      expect(item.proteinPer100g).toBeGreaterThanOrEqual(0);
      expect(item.carbsPer100g).toBeGreaterThanOrEqual(0);
      expect(item.fatPer100g).toBeGreaterThanOrEqual(0);
    }
  });
});

