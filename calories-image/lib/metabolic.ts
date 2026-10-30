/**
 * Metabolic Health & Nutrition Guardrails Engine
 * 
 * Clinical Focus:
 * - Fatty Liver (MASLD) dietary support
 * - High Insulin & Insulin Resistance support
 * - Added Sugar reduction (WHO guideline < 25g/day)
 * - Glycemic Index (GI) and Glycemic Load (GL) assessment
 * - Meal Frequency and Spacing optimization
 * 
 * Medical & Product Principles:
 * 1. Non-diagnostic, educational decision support.
 * 2. Independent evaluation: Sugar != GI (White rice has high GI but no added sugar).
 * 3. Daily cumulative context: Evaluates the whole day, not just single foods in isolation.
 * 4. Configurable strictness: Gentle - Balanced - Strict.
 * 5. Constructive alternatives instead of rigid bans.
 */

import {
  type SugarClassification,
  type GiCategory,
  type GlCategory,
  type StrictnessLevel,
  matchMetabolicFoodReference,
} from "./data/metabolicFoodDb";
import { round } from "./nutrition";

export { type SugarClassification, type GiCategory, type GlCategory, type StrictnessLevel };

export type MetabolicRiskSeverity = "LOW_CONCERN" | "INFORMATION" | "CAUTION" | "HIGH_CONCERN" | "UNKNOWN";

export type MetabolicFinding = {
  id: string;
  type: "added_sugar" | "total_sugar" | "high_gi" | "high_gl" | "morning_high_gi" | "meal_spacing" | "frequent_snacking";
  severity: MetabolicRiskSeverity;
  title: string;
  message: string;
  evidence: string;
  suggestion?: string;
  confidence: number;
};

export type MetabolicPreferences = {
  enabled?: boolean;
  metabolicMonitoringEnabled?: boolean;
  strictness: StrictnessLevel;
  focusFattyLiver?: boolean;
  fattyLiverConsideration?: boolean;
  focusHighInsulin?: boolean;
  highInsulinConsideration?: boolean;
  addedSugarMonitoringEnabled?: boolean;
  giMonitoringEnabled?: boolean;
  mealTimingMonitoringEnabled?: boolean;
  mealFrequencyMonitoringEnabled?: boolean;
  dailyAddedSugarLimitG?: number;
  dailyAddedSugarTargetG?: number; // Default: 25g (WHO guidance)
  dailyTotalSugarTargetG?: number;
  dailyGlycemicLoadTarget?: number;
  preferredMealsPerDay?: number; // Default: 3
  minMealIntervalMinutes?: number;
  minimumMealIntervalMinutes?: number; // Default: 180 min
  preferredFirstMealTime?: string; // e.g. "07:00"
  preferredLastMealTime?: string; // e.g. "19:30"
  warnMorningHighGi?: boolean;
  morningHighGiWarningEnabled?: boolean;
  morningWindowStart?: string; // e.g. "05:00"
  morningWindowEnd?: string; // e.g. "09:30"
  showAlternatives?: boolean;
  customDietaryNotes?: string;
};

export const DEFAULT_METABOLIC_PREFERENCES: MetabolicPreferences = {
  enabled: true,
  metabolicMonitoringEnabled: true,
  strictness: "balanced",
  focusFattyLiver: true,
  fattyLiverConsideration: true,
  focusHighInsulin: true,
  highInsulinConsideration: true,
  addedSugarMonitoringEnabled: true,
  giMonitoringEnabled: true,
  mealTimingMonitoringEnabled: true,
  mealFrequencyMonitoringEnabled: true,
  dailyAddedSugarLimitG: 25,
  dailyAddedSugarTargetG: 25, // WHO 2015 Guideline
  dailyTotalSugarTargetG: undefined,
  dailyGlycemicLoadTarget: undefined,
  preferredMealsPerDay: 3,
  minMealIntervalMinutes: 180,
  minimumMealIntervalMinutes: 180, // 3 hours
  preferredFirstMealTime: "07:00",
  preferredLastMealTime: "19:30",
  warnMorningHighGi: true,
  morningHighGiWarningEnabled: true,
  morningWindowStart: "05:00",
  morningWindowEnd: "09:30",
  showAlternatives: true,
  customDietaryNotes: "",
};

export type ItemMetabolicInput = {
  name?: string;
  foodName?: string;
  portionG: number;
  carbsG: number;
  fiberG?: number;
  sugarClassification?: SugarClassification;
  aiSugarClassification?: SugarClassification;
  addedSugarG?: number;
  aiEstimatedAddedSugarG?: number;
  totalSugarG?: number;
  aiEstimatedTotalSugarG?: number;
  giValue?: number;
  aiGiEstimate?: number;
  giCategory?: GiCategory;
  aiGiCategory?: GiCategory;
  glValue?: number;
  glCategory?: GlCategory;
  confidence?: number;
};

export type EvaluatedItemMetabolic = {
  name: string;
  portionG: number;
  sugarClassification: SugarClassification;
  addedSugarG: number;
  totalSugarG: number;
  naturalSugarG: number;
  availableCarbsG: number;
  giValue?: number;
  giCategory: GiCategory;
  giSource: "database" | "ai_inferred" | "user_confirmed" | "unknown";
  glValue?: number;
  glCategory: GlCategory;
  clarificationQuestion?: string;
  suggestedAlternative?: string;
  notes?: string;
};

export type MealMetabolicEvaluation = {
  totalMealAddedSugarG: number;
  mealAddedSugarG: number; // alias
  totalMealTotalSugarG: number;
  totalMealNaturalSugarG: number;
  hasAddedSugar: boolean;
  mealGl?: number;
  mealGlValue: number; // alias
  mealGlCategory: GlCategory;
  highestGiCategory: GiCategory;
  findings: MetabolicFinding[];
  warnings: MetabolicFinding[]; // alias
  evaluatedItems: EvaluatedItemMetabolic[];
  overallRiskLevel: MetabolicRiskSeverity;
  riskSeverity: MetabolicRiskSeverity; // alias
  newProjectedDailyAddedSugarG: number;
  cumulativeAddedSugarStatus: "NORMAL" | "APPROACHING" | "EXCEEDED";
  constructiveAlternatives: string[];
  minutesSincePreviousMeal?: number;
  cumulativeDailyImpact: {
    priorDailyAddedSugarG: number;
    newTotalDailyAddedSugarG: number;
    targetAddedSugarG?: number;
    sugarStatus: "NORMAL" | "APPROACHING" | "EXCEEDED";
  };
};

/**
 * Calculates Glycemic Load (GL)
 * Formula: GL = (GI * availableCarbsG) / 100
 * Reference scale:
 * - Low GL: <= 10
 * - Medium GL: 11 - 19
 * - High GL: >= 20
 */
export function calculateGlycemicLoad(
  gi?: number,
  availableCarbsG?: number,
): { gl?: number; category: GlCategory } {
  if (typeof gi !== "number" || typeof availableCarbsG !== "number" || gi <= 0 || availableCarbsG <= 0) {
    return { gl: 0, category: "low" };
  }

  const gl = round((gi * availableCarbsG) / 100, 1);
  let category: GlCategory = "low";
  if (gl <= 10) {
    category = "low";
  } else if (gl < 20) {
    category = "medium";
  } else {
    category = "high";
  }

  return { gl, category };
}

/**
 * Determines GI category from numeric GI value
 * - Low GI: <= 55
 * - Medium GI: 56 - 69
 * - High GI: >= 70
 */
export function getGiCategory(giValue?: number): GiCategory {
  if (typeof giValue !== "number" || giValue <= 0) return "unknown";
  if (giValue <= 55) return "low";
  if (giValue <= 69) return "medium";
  return "high";
}

/**
 * Determines GL category from numeric GL value
 * - Low GL: <= 10
 * - Medium GL: 11 - 19
 * - High GL: >= 20
 */
export function getGlCategory(glValue?: number): GlCategory {
  if (typeof glValue !== "number" || glValue <= 0) return "low";
  if (glValue <= 10) return "low";
  if (glValue < 20) return "medium";
  return "high";
}

/**
 * Checks if a given time string or ISO date falls within morning window
 */
export function isTimeInMorningWindow(
  dateOrIso: Date | string,
  windowStart = "05:00",
  windowEnd = "10:00",
): boolean {
  try {
    const d = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
    if (isNaN(d.getTime())) return false;

    // Use Vietnam local time (UTC+7)
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(d);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    const currentMinutes = hour * 60 + minute;

    const [startH, startM] = windowStart.split(":").map(Number);
    const [endH, endM] = windowEnd.split(":").map(Number);
    const startMinutes = (startH || 0) * 60 + (startM || 0);
    const endMinutes = (endH || 0) * 60 + (endM || 0);

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } catch {
    return false;
  }
}

/**
 * Computes elapsed time in minutes between two meals
 */
export function getMinutesBetweenMeals(currentEatenAt?: string, previousEatenAt?: string): number | null {
  if (!currentEatenAt || !previousEatenAt) return null;
  try {
    const cur = new Date(currentEatenAt).getTime();
    const prev = new Date(previousEatenAt).getTime();
    if (isNaN(cur) || isNaN(prev)) return null;
    const diffMs = cur - prev;
    if (diffMs < 0) return null;
    return Math.round(diffMs / 60000);
  } catch {
    return null;
  }
}

/**
 * Evaluates daily sugar status against user-defined target
 */
export function evaluateDailySugarStatus(
  dailyAddedSugarG: number,
  targetG?: number,
): "NORMAL" | "APPROACHING" | "EXCEEDED" {
  if (typeof targetG !== "number" || targetG <= 0) {
    return "NORMAL";
  }
  if (dailyAddedSugarG >= targetG) {
    return "EXCEEDED";
  }
  if (dailyAddedSugarG >= targetG * 0.8) {
    return "APPROACHING";
  }
  return "NORMAL";
}

/**
 * Resolves metabolic details for a single food item using database lookup & user inputs
 */
export function resolveItemMetabolicDetails(item: ItemMetabolicInput): EvaluatedItemMetabolic {
  const foodName = item.name || item.foodName || "";
  const ref = matchMetabolicFoodReference(foodName);
  const portionG = item.portionG > 0 ? item.portionG : 100;
  const portionRatio = portionG / 100;
  const availableCarbsG = Math.max(0, item.carbsG - (item.fiberG || 0));

  let sugarClassification: SugarClassification =
    item.sugarClassification || item.aiSugarClassification || (ref ? ref.sugarClassification : "UNKNOWN");
  const giValue: number | undefined = item.giValue ?? item.aiGiEstimate ?? ref?.giValue;
  const giCategory: GiCategory = item.giCategory ?? item.aiGiCategory ?? (giValue ? getGiCategory(giValue) : (ref?.giCategory || "unknown"));
  const giSource: EvaluatedItemMetabolic["giSource"] = (item.giValue || item.aiGiEstimate) ? "user_confirmed" : ref ? "database" : "unknown";

  const rawAddedSugar = item.addedSugarG ?? item.aiEstimatedAddedSugarG;
  const rawTotalSugar = item.totalSugarG ?? item.aiEstimatedTotalSugarG;

  let addedSugarG = typeof rawAddedSugar === "number" ? rawAddedSugar : (ref ? round(ref.typicalAddedSugarPer100g * portionRatio, 1) : 0);
  let totalSugarG = typeof rawTotalSugar === "number" ? rawTotalSugar : (ref ? round(ref.typicalTotalSugarPer100g * portionRatio, 1) : addedSugarG);

  // Detect explicit user phrasing for sweetened drinks/foods (e.g. "thêm đường", "pha đường")
  const lowerFoodName = foodName.toLowerCase();
  if (lowerFoodName.includes("thêm đường") || lowerFoodName.includes("pha đường") || lowerFoodName.includes("cho đường")) {
    sugarClassification = sugarClassification === "NATURAL_SUGAR" ? "BOTH_NATURAL_AND_ADDED" : "ADDED_SUGAR";
    if (addedSugarG === 0) {
      addedSugarG = round(Math.max(5, availableCarbsG * 0.4), 1);
    }
  }

  // Consistency adjustments
  if (sugarClassification === "NO_KNOWN_SUGAR") {
    addedSugarG = 0;
    if (totalSugarG < 0.5) totalSugarG = 0;
  } else if (sugarClassification === "NATURAL_SUGAR") {
    addedSugarG = 0;
  } else if (sugarClassification === "ADDED_SUGAR") {
    if (addedSugarG === 0 && totalSugarG > 0) {
      addedSugarG = totalSugarG;
    }
  }

  const naturalSugarG = Math.max(0, round(totalSugarG - addedSugarG, 1));
  const { gl, category: glCategory } = calculateGlycemicLoad(giValue, availableCarbsG);

  return {
    name: foodName,
    portionG,
    sugarClassification,
    addedSugarG,
    totalSugarG,
    naturalSugarG,
    availableCarbsG,
    giValue,
    giCategory,
    giSource,
    glValue: gl,
    glCategory,
    clarificationQuestion: ref?.clarificationQuestion,
    suggestedAlternative: ref?.suggestedAlternative,
    notes: ref?.notes,
  };
}

/**
 * Main Deterministic Metabolic Risk Assessment Engine
 */
export function evaluateMealMetabolic(params: {
  mealType: string;
  eatenAt?: string;
  eatenAtIso?: string;
  items: ItemMetabolicInput[];
  preferences: MetabolicPreferences;
  previousMealEatenAt?: string;
  previousMealEatenAtIso?: string;
  priorDailyAddedSugarG?: number;
  todaySnackCount?: number;
}): MealMetabolicEvaluation {
  const { preferences } = params;
  const eatenAt = params.eatenAt || params.eatenAtIso || new Date().toISOString();
  const previousMealEatenAt = params.previousMealEatenAt || params.previousMealEatenAtIso;
  const isEnabled = preferences.enabled ?? preferences.metabolicMonitoringEnabled ?? true;
  const strictness = preferences.strictness || "balanced";
  const dailyTarget = preferences.dailyAddedSugarLimitG ?? preferences.dailyAddedSugarTargetG ?? 25;
  const minInterval = preferences.minMealIntervalMinutes ?? preferences.minimumMealIntervalMinutes ?? 180;
  const warnMorning = preferences.warnMorningHighGi ?? preferences.morningHighGiWarningEnabled ?? true;

  const evaluatedItems = params.items.map(resolveItemMetabolicDetails);
  const totalMealAddedSugarG = round(evaluatedItems.reduce((acc, it) => acc + it.addedSugarG, 0), 1);
  const totalMealTotalSugarG = round(evaluatedItems.reduce((acc, it) => acc + it.totalSugarG, 0), 1);
  const totalMealNaturalSugarG = round(evaluatedItems.reduce((acc, it) => acc + it.naturalSugarG, 0), 1);
  const hasAddedSugar = totalMealAddedSugarG > 0.5;

  // Meal-level GL: sum of GLs of items (additive glycemic load model)
  const totalMealGl = round(evaluatedItems.reduce((acc, it) => acc + (it.glValue || 0), 0), 1);
  let mealGlCategory: GlCategory = "low";
  if (totalMealGl <= 10) mealGlCategory = "low";
  else if (totalMealGl < 20) mealGlCategory = "medium";
  else mealGlCategory = "high";

  // Highest GI among carbohydrate items
  let highestGiCategory: GiCategory = "low";
  for (const it of evaluatedItems) {
    if (it.giCategory === "high") {
      highestGiCategory = "high";
      break;
    }
    if (it.giCategory === "medium") {
      highestGiCategory = "medium";
    }
  }

  const findings: MetabolicFinding[] = [];

  if (isEnabled) {
    // 1. ADDED SUGAR CHECK (Cumulative & Individual)
    if (hasAddedSugar) {
      const priorSugar = params.priorDailyAddedSugarG || 0;
      const newTotalDailySugar = round(priorSugar + totalMealAddedSugarG, 1);

      if (newTotalDailySugar > dailyTarget) {
        findings.push({
          id: "exceeded_daily_added_sugar",
          type: "added_sugar",
          severity: "HIGH_CONCERN",
          title: "Tổng đường bổ sung trong ngày vượt ngưỡng",
          message: `Bữa ăn này thêm ~${totalMealAddedSugarG}g đường, nâng tổng đường bổ sung hôm nay lên ${newTotalDailySugar}g (vượt mục tiêu ${dailyTarget}g/ngày).`,
          evidence: `Khuyến nghị WHO (2015): Đường tự do/bổ sung nên dưới 5-10% tổng năng lượng (~25g/ngày) để hạn chế tích mỡ gan (MASLD) và giảm đề kháng insulin.`,
          suggestion: "Bạn có thể cân nhắc chọn đồ uống không đường hoặc giảm ngọt cho các bữa tiếp theo trong ngày.",
          confidence: 0.9,
        });
      } else if (newTotalDailySugar >= dailyTarget * 0.8) {
        findings.push({
          id: "approaching_daily_added_sugar",
          type: "added_sugar",
          severity: "CAUTION",
          title: "Đường bổ sung đang tiến gần ngưỡng mục tiêu",
          message: `Bữa ăn này có ~${totalMealAddedSugarG}g đường bổ sung, đưa tổng tích lũy hôm nay lên ${newTotalDailySugar}g / ${dailyTarget}g.`,
          evidence: "Theo dõi lượng đường tích lũy giúp bạn chủ động cân đối phần còn lại của ngày.",
          suggestion: "Nếu được, ưu tiên các món thanh đạm, ít ngọt cho bữa tiếp theo.",
          confidence: 0.85,
        });
      } else if (strictness === "strict" || totalMealAddedSugarG >= 10) {
        findings.push({
          id: "meal_contains_added_sugar",
          type: "added_sugar",
          severity: strictness === "strict" ? "CAUTION" : "INFORMATION",
          title: "Bữa ăn có thành phần đường bổ sung",
          message: `Ghi nhận ~${totalMealAddedSugarG}g đường bổ sung trong bữa ăn này (chủ yếu từ đồ ngọt, sữa đặc hoặc nước sốt).`,
          evidence: "Đường bổ sung giải phóng fructose tự do nhanh vào gan, khác với đường tự nhiên đi kèm chất xơ trong trái cây nguyên quả.",
          suggestion: evaluatedItems.find((it) => it.addedSugarG > 0)?.suggestedAlternative,
          confidence: 0.8,
        });
      }
    }

    // 2. MORNING HIGH-GI FOOD WARNING
    if (
      warnMorning &&
      isTimeInMorningWindow(eatenAt, preferences.morningWindowStart, preferences.morningWindowEnd) &&
      (highestGiCategory === "high" || mealGlCategory === "high")
    ) {
      findings.push({
        id: "morning_high_gi_warning",
        type: "morning_high_gi",
        severity: strictness === "strict" ? "CAUTION" : "INFORMATION",
        title: "Bữa sáng: Món có chỉ số đường huyết (GI) cao",
        message: "Bạn đang ăn món có thành phần hấp thu nhanh trong khung giờ sáng sớm (sau khi nhịn qua đêm).",
        evidence: "Sau giấc ngủ đêm, cơ thể nhạy với dao động đường huyết. Món tinh bột tinh chế đơn lẻ có thể tạo đỉnh đường huyết nhanh rồi tụt nhanh, gây đói sớm và buồn ngủ.",
        suggestion: "Bạn có thể kết hợp thêm protein (trứng, thịt nạc, đậu phụ) và chất xơ rau củ để làm chậm quá trình hấp thu tinh bột, giúp duy trì năng lượng ổn định hơn.",
        confidence: 0.85,
      });
    }

    // 3. GLYCEMIC LOAD ALERT (Independent of sugar)
    if (mealGlCategory === "high" && !findings.some((f) => f.type === "morning_high_gi")) {
      findings.push({
        id: "high_glycemic_load",
        type: "high_gl",
        severity: strictness === "strict" ? "CAUTION" : "INFORMATION",
        title: "Tải lượng đường huyết bữa ăn ở mức cao (GL ≥ 20)",
        message: `Tổng tải lượng đường huyết ước tính: ${totalMealGl}. Món ăn có lượng tinh bột hấp thu tương đối nhiều so với khẩu phần.`,
        evidence: "Tải lượng đường huyết (GL) phản ánh cả chỉ số GI và lượng tinh bột ăn vào (GL = GI × carb / 100).",
        suggestion: "Bạn có thể giảm nhẹ khẩu phần tinh bột hoặc tăng cường rau xanh để cân bằng bữa ăn.",
        confidence: 0.8,
      });
    }

    // 4. MEAL SPACING MONITORING
    let minutesElapsed: number | null = null;
    if (previousMealEatenAt) {
      minutesElapsed = getMinutesBetweenMeals(eatenAt, previousMealEatenAt);
      if (
        minutesElapsed !== null &&
        minutesElapsed > 0 &&
        minutesElapsed < minInterval
      ) {
        findings.push({
          id: "meal_spacing_short",
          type: "meal_spacing",
          severity: strictness === "strict" ? "CAUTION" : "INFORMATION",
          title: "Khoảng cách giữa hai bữa ăn khá gần",
          message: `Lần ăn này diễn ra sau bữa trước ${Math.round(minutesElapsed)} phút (ngắn hơn mốc mục tiêu ${minInterval} phút của bạn).`,
          evidence: "Khoảng cách hợp lý giữa các bữa ăn (3-4 giờ) cho phép nồng độ insulin trở về mức cơ bản, hỗ trợ đốt mỡ và bảo vệ gan khỏi quá tải trao đổi chất.",
          suggestion: "Nếu đây không phải do đói thực sự, bạn có thể uống nước lọc hoặc dời nhẹ bữa phụ để tạo nhịp sinh học đều đặn.",
          confidence: 0.85,
        });
      }
    }

    // 5. SNACK FREQUENCY
    if (
      params.mealType === "snack" &&
      typeof params.todaySnackCount === "number" &&
      params.todaySnackCount >= 2
    ) {
      findings.push({
        id: "frequent_snacking",
        type: "frequent_snacking",
        severity: "INFORMATION",
        title: "Nhiều bữa phụ trong ngày",
        message: `Bạn đã ghi nhận ${params.todaySnackCount + 1} bữa phụ hôm nay.`,
        evidence: "Tập trung năng lượng vào các bữa chính đủ no sẽ giúp hạn chế cảm giác thèm ăn vặt liên tục.",
        suggestion: "Xem lại lượng đạm và chất xơ ở các bữa chính để đảm bảo cảm giác no lâu dài.",
        confidence: 0.75,
      });
    }
  }

  // Derive Overall Risk Level
  let overallRiskLevel: MetabolicRiskSeverity = "LOW_CONCERN";
  if (findings.some((f) => f.severity === "HIGH_CONCERN")) {
    overallRiskLevel = "HIGH_CONCERN";
  } else if (findings.some((f) => f.severity === "CAUTION")) {
    overallRiskLevel = "CAUTION";
  } else if (findings.some((f) => f.severity === "INFORMATION")) {
    overallRiskLevel = "INFORMATION";
  }

  const priorSugar = params.priorDailyAddedSugarG || 0;
  const newTotalDailyAddedSugarG = round(priorSugar + totalMealAddedSugarG, 1);
  const sugarStatus = evaluateDailySugarStatus(newTotalDailyAddedSugarG, dailyTarget);

  // Extract non-empty constructive suggestions
  const constructiveAlternatives: string[] = [];
  findings.forEach((f) => {
    if (f.suggestion && !constructiveAlternatives.includes(f.suggestion)) {
      constructiveAlternatives.push(f.suggestion);
    }
  });
  evaluatedItems.forEach((it) => {
    if (it.suggestedAlternative && !constructiveAlternatives.includes(it.suggestedAlternative)) {
      constructiveAlternatives.push(it.suggestedAlternative);
    }
  });

  const minutesSincePreviousMeal = previousMealEatenAt ? getMinutesBetweenMeals(eatenAt, previousMealEatenAt) ?? undefined : undefined;

  return {
    totalMealAddedSugarG,
    mealAddedSugarG: totalMealAddedSugarG,
    totalMealTotalSugarG,
    totalMealNaturalSugarG,
    hasAddedSugar,
    mealGl: totalMealGl > 0 ? totalMealGl : undefined,
    mealGlValue: totalMealGl,
    mealGlCategory,
    highestGiCategory,
    findings,
    warnings: findings,
    evaluatedItems,
    overallRiskLevel,
    riskSeverity: overallRiskLevel,
    newProjectedDailyAddedSugarG: newTotalDailyAddedSugarG,
    cumulativeAddedSugarStatus: sugarStatus,
    constructiveAlternatives,
    minutesSincePreviousMeal,
    cumulativeDailyImpact: {
      priorDailyAddedSugarG: priorSugar,
      newTotalDailyAddedSugarG,
      targetAddedSugarG: dailyTarget,
      sugarStatus,
    },
  };
}
