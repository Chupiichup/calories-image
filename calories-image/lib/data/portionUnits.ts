import { removeVietnameseTones } from "./seedFoods";
import { round } from "@/lib/nutrition";

export interface PortionUnitOption {
  id: string;
  unitName: string; // e.g. "quả", "củ", "cái", "chiếc", "bát ăn cơm", "tô", "ly", "hộp", "lát", "g"
  label: string; // e.g. "1 quả vừa (~200g)", "g (gam)"
  shortLabel: string; // e.g. "quả (~200g)", "bát (~150g)", "g"
  gramsPerUnit: number;
  isGramUnit?: boolean;
  step?: number;
  quickFractions?: number[];
}

/**
 * Natural unit rules and default weights (in grams) for common Vietnamese foods
 */
const NATURAL_FOOD_UNIT_PATTERNS: Array<{
  pattern: RegExp;
  unitName: string;
  defaultGrams: number;
  unitVariants?: Array<{ label: string; shortLabel: string; grams: number }>;
}> = [
  {
    pattern: /dua\s*(chuot|leo)/i,
    unitName: "quả",
    defaultGrams: 200,
    unitVariants: [
      { label: "1 quả vừa (~200g)", shortLabel: "quả vừa (~200g)", grams: 200 },
      { label: "1 quả to (~250g)", shortLabel: "quả to (~250g)", grams: 250 },
      { label: "1 quả nhỏ (~150g)", shortLabel: "quả nhỏ (~150g)", grams: 150 },
    ],
  },
  {
    pattern: /trung\s*(cut)/i,
    unitName: "quả",
    defaultGrams: 12,
    unitVariants: [
      { label: "1 quả (~12g)", shortLabel: "quả (~12g)", grams: 12 },
    ],
  },
  {
    pattern: /trung/i,
    unitName: "quả",
    defaultGrams: 55,
    unitVariants: [
      { label: "1 quả (~55g)", shortLabel: "quả (~55g)", grams: 55 },
      { label: "2 quả (~110g)", shortLabel: "2 quả (~110g)", grams: 110 },
    ],
  },
  {
    pattern: /chuoi/i,
    unitName: "quả",
    defaultGrams: 110,
    unitVariants: [
      { label: "1 quả vừa (~110g)", shortLabel: "quả vừa (~110g)", grams: 110 },
      { label: "1 quả to (~140g)", shortLabel: "quả to (~140g)", grams: 140 },
    ],
  },
  {
    pattern: /ca\s*chua(?!\s*sot)/i,
    unitName: "quả",
    defaultGrams: 120,
    unitVariants: [
      { label: "1 quả vừa (~120g)", shortLabel: "quả vừa (~120g)", grams: 120 },
      { label: "1 quả to (~150g)", shortLabel: "quả to (~150g)", grams: 150 },
      { label: "1 quả nhỏ (~80g)", shortLabel: "quả nhỏ (~80g)", grams: 80 },
    ],
  },
  {
    pattern: /\b(qua\s*tao|trai\s*tao|tao)\b(?!\s*bon)/i,
    unitName: "quả",
    defaultGrams: 150,
    unitVariants: [
      { label: "1 quả vừa (~150g)", shortLabel: "quả vừa (~150g)", grams: 150 },
      { label: "1 quả to (~200g)", shortLabel: "quả to (~200g)", grams: 200 },
    ],
  },
  {
    pattern: /\b(qua\s*cam|trai\s*cam|cam)\b(?!\s*sanh\s*kg)/i,
    unitName: "quả",
    defaultGrams: 200,
    unitVariants: [
      { label: "1 quả vừa (~200g)", shortLabel: "quả vừa (~200g)", grams: 200 },
    ],
  },
  {
    pattern: /\b(qua\s*oi|trai\s*oi|oi)\b/i,
    unitName: "quả",
    defaultGrams: 180,
    unitVariants: [
      { label: "1 quả vừa (~180g)", shortLabel: "quả vừa (~180g)", grams: 180 },
    ],
  },
  {
    pattern: /\b(chanh)\b/i,
    unitName: "quả",
    defaultGrams: 50,
    unitVariants: [
      { label: "1 quả (~50g)", shortLabel: "quả (~50g)", grams: 50 },
    ],
  },
  {
    pattern: /qua\s*bo|trai\s*bo/i,
    unitName: "quả",
    defaultGrams: 200,
    unitVariants: [
      { label: "1 quả vừa (~200g)", shortLabel: "quả vừa (~200g)", grams: 200 },
    ],
  },
  {
    pattern: /khoai\s*(lang|tay|so|mon)/i,
    unitName: "củ",
    defaultGrams: 150,
    unitVariants: [
      { label: "1 củ vừa (~150g)", shortLabel: "củ vừa (~150g)", grams: 150 },
      { label: "1 củ to (~200g)", shortLabel: "củ to (~200g)", grams: 200 },
      { label: "1 củ nhỏ (~100g)", shortLabel: "củ nhỏ (~100g)", grams: 100 },
    ],
  },
  {
    pattern: /ca\s*rot/i,
    unitName: "củ",
    defaultGrams: 120,
    unitVariants: [
      { label: "1 củ vừa (~120g)", shortLabel: "củ vừa (~120g)", grams: 120 },
      { label: "1 củ to (~150g)", shortLabel: "củ to (~150g)", grams: 150 },
    ],
  },
  {
    pattern: /cu\s*(cai|den)/i,
    unitName: "củ",
    defaultGrams: 150,
    unitVariants: [
      { label: "1 củ vừa (~150g)", shortLabel: "củ vừa (~150g)", grams: 150 },
    ],
  },
  {
    pattern: /com\s*(trang|tam|lut|gao\s*lut|chay|nong)/i,
    unitName: "bát ăn cơm",
    defaultGrams: 150,
    unitVariants: [
      { label: "1 bát ăn cơm (~150g)", shortLabel: "bát ăn cơm (~150g)", grams: 150 },
      { label: "1 đĩa nhỏ (~200g)", shortLabel: "đĩa (~200g)", grams: 200 },
      { label: "1 muôi xới cơm (~70g)", shortLabel: "muôi (~70g)", grams: 70 },
    ],
  },
  {
    pattern: /\b(chao|sup|canh)\b/i,
    unitName: "bát",
    defaultGrams: 250,
    unitVariants: [
      { label: "1 bát vừa (~250g)", shortLabel: "bát vừa (~250g)", grams: 250 },
      { label: "1 tô lớn (~400g)", shortLabel: "tô lớn (~400g)", grams: 400 },
    ],
  },
  {
    pattern: /\b(pho|bun\s*(bo|cha|rieu|thit)|hu\s*tiu|banh\s*canh|mien)\b/i,
    unitName: "tô",
    defaultGrams: 500,
    unitVariants: [
      { label: "1 tô / bát đầy đủ (~500g)", shortLabel: "tô đầy đủ (~500g)", grams: 500 },
      { label: "1 tô ít bánh (~400g)", shortLabel: "tô ít bánh (~400g)", grams: 400 },
    ],
  },
  {
    pattern: /banh\s*mi\s*(kep|thit|cha|op\s*la|khong|trang|den)/i,
    unitName: "cái / ổ",
    defaultGrams: 90,
    unitVariants: [
      { label: "1 cái / ổ vừa (~90g)", shortLabel: "ổ / cái (~90g)", grams: 90 },
      { label: "1 ổ nhỏ (~60g)", shortLabel: "ổ nhỏ (~60g)", grams: 60 },
    ],
  },
  {
    pattern: /banh\s*bao/i,
    unitName: "cái",
    defaultGrams: 120,
    unitVariants: [
      { label: "1 cái (~120g)", shortLabel: "cái (~120g)", grams: 120 },
    ],
  },
  {
    pattern: /xuc\s*xich|cha\s*lua|cha\s*gio|nem\s*(ran|chua)/i,
    unitName: "cái",
    defaultGrams: 40,
    unitVariants: [
      { label: "1 cái (~40g)", shortLabel: "cái (~40g)", grams: 40 },
    ],
  },
  {
    pattern: /goi\s*cuon/i,
    unitName: "cuốn",
    defaultGrams: 60,
    unitVariants: [
      { label: "1 cuốn (~60g)", shortLabel: "cuốn (~60g)", grams: 60 },
    ],
  },
  {
    pattern: /sua\s*chua/i,
    unitName: "hộp",
    defaultGrams: 100,
    unitVariants: [
      { label: "1 hộp (~100g)", shortLabel: "hộp (~100g)", grams: 100 },
    ],
  },
  {
    pattern: /sua\s*(tuoi|dau\s*nanh)/i,
    unitName: "hộp",
    defaultGrams: 180,
    unitVariants: [
      { label: "1 hộp 180ml (~180g)", shortLabel: "hộp 180ml (~180g)", grams: 180 },
      { label: "1 ly 250ml (~250g)", shortLabel: "ly 250ml (~250g)", grams: 250 },
    ],
  },
  {
    pattern: /ca\s*phe|nuoc\s*cam|nuoc\s*ep|sinh\s*to|tra\s*(da|sua|tac|dao)/i,
    unitName: "ly",
    defaultGrams: 250,
    unitVariants: [
      { label: "1 ly vừa (~250ml)", shortLabel: "ly (~250ml)", grams: 250 },
      { label: "1 ly lớn (~350ml)", shortLabel: "ly lớn (~350ml)", grams: 350 },
    ],
  },
  {
    pattern: /sandwich|lat\s*banh\s*mi/i,
    unitName: "lát",
    defaultGrams: 40,
    unitVariants: [
      { label: "1 lát (~40g)", shortLabel: "lát (~40g)", grams: 40 },
    ],
  },
  {
    pattern: /pho\s*mai\s*con\s*bo\s*cuoi/i,
    unitName: "viên",
    defaultGrams: 15,
    unitVariants: [
      { label: "1 viên tam giác (~15g)", shortLabel: "viên (~15g)", grams: 15 },
    ],
  },
  {
    pattern: /muop\s*(dang|kho\s*qua)/i,
    unitName: "quả",
    defaultGrams: 180,
    unitVariants: [
      { label: "1 quả vừa (~180g)", shortLabel: "quả vừa (~180g)", grams: 180 },
      { label: "1 quả nhỏ (~120g)", shortLabel: "quả nhỏ (~120g)", grams: 120 },
    ],
  },
  {
    pattern: /muop/i,
    unitName: "quả",
    defaultGrams: 200,
    unitVariants: [
      { label: "1 quả vừa (~200g)", shortLabel: "quả vừa (~200g)", grams: 200 },
      { label: "1 quả to (~300g)", shortLabel: "quả to (~300g)", grams: 300 },
      { label: "1 quả nhỏ (~150g)", shortLabel: "quả nhỏ (~150g)", grams: 150 },
    ],
  },
  {
    pattern: /suon/i,
    unitName: "dẻ",
    defaultGrams: 150,
    unitVariants: [
      { label: "1 dẻ sườn (~150g)", shortLabel: "dẻ (~150g)", grams: 150 },
      { label: "1 lạng sườn (~100g)", shortLabel: "lạng (~100g)", grams: 100 },
      { label: "1 bát canh sườn (~200g)", shortLabel: "bát (~200g)", grams: 200 },
    ],
  },
  {
    pattern: /\b(lac\s*(song|nhan)?|dau\s*phong\s*(song)?|lac)\b/i,
    unitName: "nắm",
    defaultGrams: 30,
    unitVariants: [
      { label: "1 nắm nhỏ (~30g)", shortLabel: "nắm (~30g)", grams: 30 },
      { label: "1 thìa canh (~15g)", shortLabel: "thìa (~15g)", grams: 15 },
      { label: "1 lạng (~100g)", shortLabel: "lạng (~100g)", grams: 100 },
    ],
  },
  {
    pattern: /trai\s*bau|qua\s*bau|bau\s*tuoi/i,
    unitName: "khúc",
    defaultGrams: 200,
    unitVariants: [
      { label: "1 khúc bầu (~200g)", shortLabel: "khúc (~200g)", grams: 200 },
      { label: "1 quả nhỏ (~300g)", shortLabel: "quả nhỏ (~300g)", grams: 300 },
    ],
  },
  {
    pattern: /su\s*su/i,
    unitName: "quả",
    defaultGrams: 200,
    unitVariants: [
      { label: "1 quả vừa (~200g)", shortLabel: "quả vừa (~200g)", grams: 200 },
    ],
  },
  {
    pattern: /su\s*hao/i,
    unitName: "củ",
    defaultGrams: 250,
    unitVariants: [
      { label: "1 củ vừa (~250g)", shortLabel: "củ vừa (~250g)", grams: 250 },
    ],
  },
  {
    pattern: /ngo|bap\s*(ngot|my|nep)/i,
    unitName: "bắp",
    defaultGrams: 150,
    unitVariants: [
      { label: "1 bắp ngô (~150g)", shortLabel: "bắp (~150g)", grams: 150 },
    ],
  },
  {
    pattern: /dau\s*bap/i,
    unitName: "quả",
    defaultGrams: 15,
    unitVariants: [
      { label: "1 đĩa luộc (~120g)", shortLabel: "đĩa (~120g)", grams: 120 },
      { label: "1 quả (~15g)", shortLabel: "quả (~15g)", grams: 15 },
    ],
  },
  {
    pattern: /dau\s*an|mo\s*(heo|lon)|dau\s*oliu/i,
    unitName: "thìa canh",
    defaultGrams: 14,
    unitVariants: [
      { label: "1 thìa canh (~14g - 15ml)", shortLabel: "thìa canh (~14g)", grams: 14 },
      { label: "1 thìa cà phê (~5g - 5ml)", shortLabel: "thìa cà phê (~5g)", grams: 5 },
    ],
  },
  {
    pattern: /nuoc\s*mam|nuoc\s*tuong|xi\s*dau|dau\s*hao/i,
    unitName: "thìa canh",
    defaultGrams: 15,
    unitVariants: [
      { label: "1 thìa canh (~15g)", shortLabel: "thìa canh (~15g)", grams: 15 },
      { label: "1 thìa cà phê (~5g)", shortLabel: "thìa cà phê (~5g)", grams: 5 },
    ],
  },
  {
    pattern: /thit.*song|bap\s*bo|nac\s*(than|vai)|ba\s*chi.*song|uc\s*ga|dui\s*ga|canh\s*ga|tom.*song|muc.*song|ca.*song/i,
    unitName: "lạng",
    defaultGrams: 100,
    unitVariants: [
      { label: "1 lạng (~100g)", shortLabel: "lạng (~100g)", grams: 100 },
      { label: "1 miếng / phần (~150g)", shortLabel: "phần (~150g)", grams: 150 },
    ],
  },
];

/**
 * Extracts a recognizable unit noun from commonUnits label string.
 */
function extractUnitNoun(label: string): string {
  const norm = removeVietnameseTones(label);
  if (/bat\s*an\s*com|chen\s*\(bat|chen\s*com|bat\s*con/i.test(norm)) return "bát ăn cơm";
  if (/qua|trai/i.test(norm)) return "quả";
  if (/cu/i.test(norm)) return "củ";
  if (/de\s*suon|de/i.test(norm)) return "dẻ";
  if (/lang/i.test(norm)) return "lạng";
  if (/khuc/i.test(norm)) return "khúc";
  if (/bap|trai\s*bap/i.test(norm)) return "bắp";
  if (/bat/i.test(norm)) return "bát";
  if (/to/i.test(norm)) return "tô";
  if (/o\s*\(banh|o\s*banh|o\s*vu/i.test(norm)) return "ổ";
  if (/cai|chiec/i.test(norm)) return "cái";
  if (/ly|coc|tach/i.test(norm)) return "ly / cốc";
  if (/hop/i.test(norm)) return "hộp";
  if (/lon/i.test(norm)) return "lon";
  if (/lat|mieng/i.test(norm)) return "lát";
  if (/dia/i.test(norm)) return "đĩa";
  if (/cuon/i.test(norm)) return "cuốn";
  if (/vien/i.test(norm)) return "viên";
  if (/muoi|thuc/i.test(norm)) return "múi";
  if (/nam/i.test(norm)) return "nắm";
  if (/thia|muong/i.test(norm)) return "thìa";
  if (/goi/i.test(norm)) return "gói";
  if (/tep/i.test(norm)) return "tép";
  if (/nhanh/i.test(norm)) return "nhánh";
  return "đơn vị";
}

/**
 * Resolves all available portion unit options for a given food.
 * Always includes natural units first (if applicable), followed by the gram ('g') option.
 */
export function resolveFoodPortionUnits(
  foodName: string,
  commonUnits?: Array<{ label: string; grams: number }>,
  defaultPortionG?: number,
): PortionUnitOption[] {
  const options: PortionUnitOption[] = [];
  const addedIds = new Set<string>();

  const normName = removeVietnameseTones(foodName || "");

  // 1. Check if commonUnits are explicitly provided on the food item
  if (commonUnits && commonUnits.length > 0) {
    for (let idx = 0; idx < commonUnits.length; idx++) {
      const u = commonUnits[idx];
      if (u.grams > 0) {
        const noun = extractUnitNoun(u.label);
        const id = `cu-${idx}-${noun}-${u.grams}`;
        if (!addedIds.has(id)) {
          addedIds.add(id);
          // clean shortLabel
          let short = u.label;
          if (short.startsWith("1 ")) short = short.substring(2);
          if (!short.includes("g") && !short.includes("ml")) {
            short += ` (~${u.grams}g)`;
          }

          options.push({
            id,
            unitName: noun,
            label: u.label,
            shortLabel: short,
            gramsPerUnit: u.grams,
            isGramUnit: false,
            step: 0.1,
            quickFractions: [0.1, 0.5, 1, 1.5, 2],
          });
        }
      }
    }
  }

  // 2. If no specific natural unit was derived from commonUnits, or to supplement standard weights:
  // Match food name against Vietnamese staple patterns
  const matchPattern = NATURAL_FOOD_UNIT_PATTERNS.find((p) => p.pattern.test(normName));
  if (matchPattern) {
    // If no commonUnits were found, or if commonUnits only had gram-like entries:
    if (options.length === 0) {
      if (matchPattern.unitVariants && matchPattern.unitVariants.length > 0) {
        matchPattern.unitVariants.forEach((v, vIdx) => {
          const id = `pat-${matchPattern.unitName}-${v.grams}-${vIdx}`;
          if (!addedIds.has(id)) {
            addedIds.add(id);
            options.push({
              id,
              unitName: matchPattern.unitName,
              label: v.label,
              shortLabel: v.shortLabel,
              gramsPerUnit: v.grams,
              isGramUnit: false,
              step: 0.1,
              quickFractions: [0.1, 0.5, 1, 1.5, 2],
            });
          }
        });
      } else {
        const id = `pat-${matchPattern.unitName}-${matchPattern.defaultGrams}`;
        if (!addedIds.has(id)) {
          addedIds.add(id);
          options.push({
            id,
            unitName: matchPattern.unitName,
            label: `1 ${matchPattern.unitName} (~${matchPattern.defaultGrams}g)`,
            shortLabel: `${matchPattern.unitName} (~${matchPattern.defaultGrams}g)`,
            gramsPerUnit: matchPattern.defaultGrams,
            isGramUnit: false,
            step: 0.1,
            quickFractions: [0.1, 0.5, 1, 1.5, 2],
          });
        }
      }
    }
  }

  // 3. Always include Gram (g) as an available option so users can enter exact grams
  const gramOption: PortionUnitOption = {
    id: "unit-g",
    unitName: "g",
    label: "g (gam - nhập số gram trực tiếp)",
    shortLabel: "g",
    gramsPerUnit: 1,
    isGramUnit: true,
    step: 5,
    quickFractions: [50, 100, 150, 200, 300],
  };

  options.push(gramOption);

  return options;
}

/**
 * Returns the default active unit option.
 * If a natural unit exists (e.g. quả, củ, cái, bát ăn cơm), it is selected by default.
 * Otherwise, the gram unit ('g') is selected.
 */
export function getDefaultUnitOption(options: PortionUnitOption[]): PortionUnitOption {
  const natural = options.find((o) => !o.isGramUnit);
  return natural || options[options.length - 1];
}

/**
 * Calculates initial unit quantity and portionG when adding a food item.
 */
export function calculateInitialPortionState(
  foodName: string,
  commonUnits?: Array<{ label: string; grams: number }>,
  defaultPortionG?: number,
  existingPortionG?: number,
): {
  unitOptions: PortionUnitOption[];
  selectedUnit: PortionUnitOption;
  unitQuantity: number;
  portionG: number;
} {
  const unitOptions = resolveFoodPortionUnits(foodName, commonUnits, defaultPortionG);
  const selectedUnit = getDefaultUnitOption(unitOptions);

  if (selectedUnit.isGramUnit) {
    const portionG = existingPortionG && existingPortionG > 0 ? existingPortionG : (defaultPortionG || 100);
    return {
      unitOptions,
      selectedUnit,
      unitQuantity: portionG,
      portionG,
    };
  }

  // Natural unit
  if (existingPortionG && existingPortionG > 0) {
    const rawQty = existingPortionG / selectedUnit.gramsPerUnit;
    const unitQuantity = round(rawQty, 2);
    return {
      unitOptions,
      selectedUnit,
      unitQuantity,
      portionG: existingPortionG,
    };
  }

  // Default is 1 natural unit
  return {
    unitOptions,
    selectedUnit,
    unitQuantity: 1,
    portionG: selectedUnit.gramsPerUnit,
  };
}

/**
 * Computes the compact badge text for catalog search results (e.g. "+1 quả (~200g)" or "+100g")
 */
export function getFoodPortionBadgeText(food: {
  name: string;
  defaultPortionG: number;
  commonUnits?: Array<{ label: string; grams: number }>;
}): string {
  const options = resolveFoodPortionUnits(food.name, food.commonUnits, food.defaultPortionG);
  const natural = options.find((o) => !o.isGramUnit);
  if (natural) {
    return natural.shortLabel;
  }
  return `${food.defaultPortionG || 100}g`;
}

