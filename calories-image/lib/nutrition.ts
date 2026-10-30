/**
 * Deterministic Nutrition & Weight Loss Calculation Engine
 * 
 * Implements evidence-based calculations:
 * - BMI screening index
 * - Mifflin-St Jeor BMR equation
 * - Activity-adjusted TDEE
 * - Safe calorie deficit targets (protecting against crash diets)
 * - Muscle-sparing macronutrient distribution (adequate protein: 1.8 - 2.2g/kg)
 * - Deterministic portion scaling and meal aggregations
 * - Weight trend analysis (moving averages & direction)
 */

export type BiologicalSex = "male" | "female" | "prefer_not_to_say";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type WeightLossPace = "slow" | "moderate" | "aggressive";

export type NutritionValues = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export type UserProfileInput = {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: BiologicalSex;
  activityLevel: ActivityLevel;
  goalWeightKg?: number;
  isPregnantOrNursing?: boolean;
  isUnder18?: boolean;
};

export type WeightLossTimeline = {
  weightToLoseKg: number;
  totalDeficitNeededKcal: number;
  targetWeeks: number;
  targetDays: number;
  targetMonths: number;
  estimatedCompletionDate: string; // YYYY-MM-DD
  formattedCompletionDate: string; // e.g. "Thứ 6, 28/05/2027"
  weeklyWeightChangeKg: number;
  safetyStatus: "safe" | "moderate" | "aggressive_warning" | "dangerous_low_calorie" | "maintenance" | "surplus";
  safetyMessage: string;
  minSafeWeeks: number;
  minSafeCalorieFloor: number;
  idealWeeks: number;
  sustainableWeeks: number;
  gentleWeeks: number;
  rawCalorieNeeded?: number;
  rawDeficitNeededKcal?: number;
};

export type TargetCalculationOptions = {
  pace?: WeightLossPace;
  targetWeeks?: number;
  customCalorieTarget?: number;
};

export type TargetCalculationResult = {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  rawCalorieTarget: number;
  calorieTarget: number;
  safeCalorieTarget: number;
  isBelowSafetyFloor: boolean;
  absoluteSafetyFloor: number;
  deficitKcal: number;
  deficitPercent: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  warnings: string[];
  explanation: string;
  timeline: WeightLossTimeline;
};

export type WeightEntry = {
  recordedAt: string;
  weightKg: number;
};

export type MealItemInput = {
  name: string;
  portionG: number;
  nutrition: NutritionValues;
  isAiEstimated?: boolean;
  confidence?: number;
};

export const ACTIVITY_MULTIPLIER: Record<ActivityLevel, { factor: number; label: string; description: string }> = {
  sedentary: {
    factor: 1.2,
    label: "Ít vận động",
    description: "Nhân viên văn phòng, làm việc bàn giấy, ít hoặc không tập thể dục.",
  },
  light: {
    factor: 1.375,
    label: "Vận động nhẹ",
    description: "Tập luyện nhẹ nhàng 1 - 3 buổi/tuần hoặc đi bộ thường xuyên.",
  },
  moderate: {
    factor: 1.55,
    label: "Vận động vừa phải",
    description: "Tập thể thao, tập gym 3 - 5 buổi/tuần.",
  },
  active: {
    factor: 1.725,
    label: "Vận động nhiều",
    description: "Tập luyện cường độ cao 6 - 7 buổi/tuần hoặc công việc lao động tay chân.",
  },
  very_active: {
    factor: 1.9,
    label: "Rất năng động",
    description: "Vận động viên, tập 2 buổi/ngày hoặc lao động thể chất nặng.",
  },
};

export function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function validatePositive(val: number, name: string): number {
  if (typeof val !== "number" || !Number.isFinite(val) || val <= 0) {
    throw new Error(`Giá trị '${name}' phải là một số dương hợp lệ.`);
  }
  return val;
}

/**
 * Calculates BMI (Body Mass Index)
 * Formula: weight (kg) / (height (m) ^ 2)
 */
export function calculateBmi(weightKg: number, heightCm: number): { bmi: number; category: string } {
  const w = validatePositive(weightKg, "cân nặng");
  const h = validatePositive(heightCm, "chiều cao");
  const heightM = h / 100;
  const bmi = round(w / (heightM * heightM), 1);

  let category = "Bình thường";
  if (bmi < 18.5) {
    category = "Nhẹ cân";
  } else if (bmi < 23) {
    // Tiêu chuẩn WHO khu vực châu Á - Thái Bình Dương (WPRO)
    category = "Bình thường (Tiêu chuẩn châu Á)";
  } else if (bmi < 25) {
    category = "Thừa cân tiền béo phì";
  } else if (bmi < 30) {
    category = "Béo phì độ I";
  } else {
    category = "Béo phì độ II";
  }

  return { bmi, category };
}

/**
 * Calculates Basal Metabolic Rate (BMR) using Mifflin-St Jeor formula:
 * Men: 10 * weight (kg) + 6.25 * height (cm) - 5 * age (y) + 5
 * Women: 10 * weight (kg) + 6.25 * height (cm) - 5 * age (y) - 161
 */
export function calculateBmr(profile: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: BiologicalSex;
}): number {
  const w = validatePositive(profile.weightKg, "cân nặng");
  const h = validatePositive(profile.heightCm, "chiều cao");
  const age = validatePositive(profile.ageYears, "tuổi");

  const base = 10 * w + 6.25 * h - 5 * age;

  if (profile.sex === "male") {
    return round(base + 5, 0);
  } else if (profile.sex === "female") {
    return round(base - 161, 0);
  } else {
    // Trường hợp 'prefer_not_to_say': lấy giá trị trung bình giữa hai giới tính (-78)
    return round(base - 78, 0);
  }
}

/**
 * Calculates Total Daily Energy Expenditure (TDEE)
 */
export function calculateTdee(params: {
  bmr: number;
  activityLevel: ActivityLevel;
}): number {
  const bmr = validatePositive(params.bmr, "BMR");
  const factor = ACTIVITY_MULTIPLIER[params.activityLevel]?.factor ?? 1.375;
  return round(bmr * factor, 0);
}

/**
 * Calculates timeline and estimated completion date for weight goals
 */
export function calculateWeightLossTimeline(params: {
  currentWeightKg: number;
  goalWeightKg?: number;
  tdee: number;
  calorieTarget: number;
  sex?: BiologicalSex;
  desiredWeeks?: number;
}): WeightLossTimeline {
  const current = Number(params.currentWeightKg) || 0;
  const goal = typeof params.goalWeightKg === "number" && params.goalWeightKg > 0 ? params.goalWeightKg : current;
  const weightToLoseKg = Math.max(0, round(current - goal, 1));
  const totalDeficitNeededKcal = Math.round(weightToLoseKg * 7700);
  const minSafeCalorieFloor = params.sex === "female" ? 1200 : 1400;

  const dailyDeficit = Math.round(Math.max(0, params.tdee - params.calorieTarget));
  const maxSafeDailyDeficit = Math.max(100, Math.min(1000, Math.max(0, params.tdee - minSafeCalorieFloor)));
  const minSafeWeeks = maxSafeDailyDeficit > 0 && totalDeficitNeededKcal > 0
    ? Math.ceil(totalDeficitNeededKcal / (maxSafeDailyDeficit * 7))
    : 1;

  // Sustainable weeks (moderate deficit ~380 kcal/day or ~20-25% longer than minSafeWeeks)
  const moderateDailyDeficit = Math.min(maxSafeDailyDeficit, 380);
  const idealWeeks = totalDeficitNeededKcal > 0
    ? Math.max(minSafeWeeks + (minSafeWeeks >= 40 ? 11 : 4), Math.ceil(totalDeficitNeededKcal / (moderateDailyDeficit * 7)))
    : 1;

  // Gentle weeks (comfortable deficit ~250 kcal/day)
  const gentleWeeks = totalDeficitNeededKcal > 0
    ? Math.max(idealWeeks + (minSafeWeeks >= 40 ? 20 : 6), Math.ceil(totalDeficitNeededKcal / (250 * 7)))
    : 1;

  let targetWeeks = 0;
  let targetDays = 0;
  let weeklyWeightChangeKg = 0;

  if (weightToLoseKg <= 0) {
    targetWeeks = 0;
    targetDays = 0;
    weeklyWeightChangeKg = 0;
  } else if (params.desiredWeeks && params.desiredWeeks > 0) {
    targetWeeks = Math.max(1, Math.round(params.desiredWeeks));
    targetDays = targetWeeks * 7;
    weeklyWeightChangeKg = round(weightToLoseKg / targetWeeks, 2);
  } else if (params.calorieTarget < params.tdee) {
    const dailyDeficit = params.tdee - params.calorieTarget;
    targetDays = Math.ceil(totalDeficitNeededKcal / dailyDeficit);
    targetWeeks = Math.max(1, Math.round(targetDays / 7));
    weeklyWeightChangeKg = round((dailyDeficit * 7) / 7700, 2);
  } else {
    targetWeeks = minSafeWeeks;
    targetDays = targetWeeks * 7;
    weeklyWeightChangeKg = 0;
  }

  const targetMonths = round(targetWeeks / 4.33, 1);
  const dateObj = new Date(Date.now() + targetDays * 86400000);
  const estimatedCompletionDate = dateObj.toISOString().split("T")[0];
  const formattedCompletionDate = dateObj.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  let safetyStatus: WeightLossTimeline["safetyStatus"] = "safe";
  let safetyMessage = "";

  const theoreticalDailyDeficit = targetDays > 0 ? Math.round(totalDeficitNeededKcal / targetDays) : 0;
  const theoreticalCalorie = params.tdee - theoreticalDailyDeficit;

  if (weightToLoseKg <= 0) {
    safetyStatus = current === goal ? "maintenance" : "surplus";
    safetyMessage = current === goal ? "Mục tiêu duy trì cân nặng ổn định." : "Mục tiêu tăng cân / phát triển cơ bắp.";
  } else if (
    theoreticalCalorie < minSafeCalorieFloor ||
    weeklyWeightChangeKg > 1.5
  ) {
    safetyStatus = "dangerous_low_calorie";
    safetyMessage = `⚠️ Nguy hiểm: Thời gian ${targetWeeks} tuần đòi hỏi thâm hụt ${theoreticalDailyDeficit} kcal/ngày, khiến calo nạp theo toán học chỉ còn ${theoreticalCalorie} kcal/ngày (thấp hơn sàn an toàn y khoa ${minSafeCalorieFloor} kcal/ngày). Tốc độ này (${weeklyWeightChangeKg} kg/tuần) dễ gây suy giáp, mất cơ và mệt mỏi. Khuyến nghị giãn thời gian lên tối thiểu ${minSafeWeeks} tuần để nạp an toàn.`;
  } else if (weeklyWeightChangeKg > 1.0) {
    safetyStatus = "aggressive_warning";
    safetyMessage = `⚠️ Tốc độ giảm ${weeklyWeightChangeKg} kg/tuần khá nhanh (vượt 1kg/tuần). Cần đảm bảo nạp đủ đạm tối thiểu 2g/kg và bổ sung đủ vi chất.`;
  } else if (weeklyWeightChangeKg >= 0.4) {
    safetyStatus = "safe";
    safetyMessage = `✅ Tốc độ giảm ${weeklyWeightChangeKg} kg/tuần chuẩn khoa học, tối ưu để giảm mỡ và bảo tồn cơ bắp bền vững.`;
  } else {
    safetyStatus = "moderate";
    safetyMessage = `🌿 Tốc độ giảm nhẹ nhàng (~${weeklyWeightChangeKg} kg/tuần), cực kỳ thoải mái và dễ dàng duy trì lâu dài.`;
  }

  return {
    weightToLoseKg,
    totalDeficitNeededKcal,
    targetWeeks,
    targetDays,
    targetMonths,
    estimatedCompletionDate,
    formattedCompletionDate,
    weeklyWeightChangeKg,
    safetyStatus,
    safetyMessage,
    minSafeWeeks,
    minSafeCalorieFloor,
    idealWeeks,
    sustainableWeeks: idealWeeks,
    gentleWeeks,
    rawCalorieNeeded: theoreticalCalorie,
    rawDeficitNeededKcal: theoreticalDailyDeficit,
  };
}

/**
 * Calculates evidence-based safe calorie and macro targets for fat loss while sparing muscle mass.
 */
export function calculateComprehensiveTargets(
  input: UserProfileInput,
  paceOrOptions: WeightLossPace | TargetCalculationOptions = "moderate",
): TargetCalculationResult {
  const options: TargetCalculationOptions =
    typeof paceOrOptions === "string" ? { pace: paceOrOptions } : paceOrOptions;
  const pace = options.pace ?? "moderate";
  const warnings: string[] = [];

  // Special population safety checks
  if (input.isPregnantOrNursing) {
    warnings.push(
      "Bạn đang mang thai hoặc cho con bú. Không nên tự ý áp dụng chế độ thâm hụt calo giảm cân mà cần có sự tư vấn trực tiếp từ bác sĩ chuyên khoa dinh dưỡng.",
    );
  }
  if (input.isUnder18 || input.ageYears < 18) {
    warnings.push(
      "Bạn dưới 18 tuổi. Cơ thể đang trong giai đoạn phát triển thể chất tự nhiên, không nên áp dụng chế độ ăn kiêng giới hạn calo người lớn.",
    );
  }

  const { bmi, category: bmiCategory } = calculateBmi(input.weightKg, input.heightCm);
  const bmr = calculateBmr(input);
  const tdee = calculateTdee({ bmr, activityLevel: input.activityLevel });

  // Calculate weightToLose
  const goalWeight = typeof input.goalWeightKg === "number" && input.goalWeightKg > 0 ? input.goalWeightKg : input.weightKg;
  const weightToLose = Math.max(0, input.weightKg - goalWeight);
  const totalDeficitNeeded = weightToLose * 7700;

  // Determine raw calorie target based on mode
  let rawCalorieTarget: number;
  let rawDeficitKcal = 0;

  if (typeof options.targetWeeks === "number" && options.targetWeeks > 0 && weightToLose > 0) {
    const targetDays = Math.max(7, options.targetWeeks * 7);
    rawDeficitKcal = Math.round(totalDeficitNeeded / targetDays);
    rawCalorieTarget = Math.round(tdee - rawDeficitKcal);
  } else if (typeof options.customCalorieTarget === "number" && options.customCalorieTarget > 0) {
    rawCalorieTarget = Math.round(options.customCalorieTarget);
    rawDeficitKcal = Math.max(0, tdee - rawCalorieTarget);
  } else {
    const deficitRate = pace === "slow" ? 0.15 : pace === "moderate" ? 0.20 : 0.25;
    rawDeficitKcal = Math.round(tdee * deficitRate);
    rawCalorieTarget = Math.round(tdee - rawDeficitKcal);
  }

  // Safety floor: Protect against starvation response & metabolic slowdown
  // Minimum 1200 kcal for biological females, 1400 kcal for biological males.
  // Weight floor protects lean body mass (using target weight if overweight, not excess adipose tissue)
  const sexFloor = input.sex === "female" ? 1200 : 1400;
  const targetWeightRef = input.goalWeightKg && input.goalWeightKg > 0 ? Math.min(input.weightKg, input.goalWeightKg) : input.weightKg;
  const weightFloor = Math.min(22 * targetWeightRef, Math.round(tdee * 0.8));
  const absoluteSafetyFloor = Math.max(sexFloor, Math.round(weightFloor));

  const isBelowSafetyFloor = rawCalorieTarget < absoluteSafetyFloor && weightToLose > 0;

  if (isBelowSafetyFloor) {
    warnings.push(
      `Mục tiêu thời gian bạn chọn đòi hỏi mức thâm hụt quá lớn, khiến calo nạp (${rawCalorieTarget} kcal) thấp hơn sàn an toàn y học (${absoluteSafetyFloor} kcal/ngày). Ứng dụng khuyến nghị giãn thời gian tối thiểu hoặc hệ thống sẽ tự động giữ calo ở mức an toàn tối thiểu ${absoluteSafetyFloor} kcal khi lưu để bảo vệ sức khỏe.`,
    );
  }

  const safeCalorieTarget = Math.round(
    Math.min(tdee, Math.max(rawCalorieTarget, absoluteSafetyFloor))
  );

  // In duration mode (when options.targetWeeks is specified), calorieTarget returns rawCalorieTarget
  // so the slider dynamically and faithfully reflects the exact math (e.g. 994 kcal at 48 weeks vs 1204 kcal at 69 weeks).
  // safeCalorieTarget provides the clamped safe minimum (1200 kcal) for saving to database and safety badges.
  // In pace/default mode, calorieTarget uses safeCalorieTarget.
  const displayCalorieTarget = options.targetWeeks ? rawCalorieTarget : safeCalorieTarget;

  const actualDeficitKcal = Math.max(0, Math.round(tdee - displayCalorieTarget));
  const actualDeficitPercent = tdee > 0 ? round((actualDeficitKcal / tdee) * 100, 1) : 0;

  // Muscle-preserving macronutrient calculation:
  // Base macros on safeCalorieTarget (or displayCalorieTarget if higher) to ensure adequate protein & nutrition
  const macroBaseCalorie = Math.max(displayCalorieTarget, absoluteSafetyFloor);
  const proteinG = Math.round(Math.max(input.weightKg * 2.0, 75));
  const fatG = Math.round(Math.max(input.weightKg * 0.8, 45));

  const caloriesFromProtein = proteinG * 4;
  const caloriesFromFat = fatG * 9;
  const remainingCalories = Math.max(macroBaseCalorie - (caloriesFromProtein + caloriesFromFat), 0);
  const carbsG = Math.round(remainingCalories / 4);

  const fiberG = Math.round(Math.max(25, (macroBaseCalorie / 1000) * 14));

  // Compute timeline
  const timeline = calculateWeightLossTimeline({
    currentWeightKg: input.weightKg,
    goalWeightKg: input.goalWeightKg,
    tdee,
    calorieTarget: displayCalorieTarget,
    sex: input.sex,
    desiredWeeks: options.targetWeeks,
  });

  const explanation = `Mục tiêu dinh dưỡng được thiết kế theo công thức Mifflin-St Jeor với mức thâm hụt ${actualDeficitPercent}% TDEE (~${actualDeficitKcal} kcal/ngày). Lượng protein được đặt ở mức ${round(proteinG / input.weightKg, 1)}g/kg để bảo toàn tối đa khối lượng cơ bắp trong quá trình giảm mỡ.`;

  return {
    bmi,
    bmiCategory,
    bmr,
    tdee,
    rawCalorieTarget,
    calorieTarget: displayCalorieTarget,
    safeCalorieTarget,
    isBelowSafetyFloor,
    absoluteSafetyFloor,
    deficitKcal: actualDeficitKcal,
    deficitPercent: actualDeficitPercent,
    macros: {
      protein: proteinG,
      carbs: carbsG,
      fat: fatG,
      fiber: fiberG,
    },
    warnings,
    explanation,
    timeline,
  };
}

/**
 * Backward compatibility helpers
 */
export function calculateCalorieTarget({
  tdee,
  weightKg,
  targetRate = "slow",
}: {
  tdee: number;
  weightKg: number;
  targetRate?: WeightLossPace;
}): number {
  const deficitPercent = targetRate === "slow" ? 0.15 : targetRate === "moderate" ? 0.20 : 0.25;
  const baseTarget = tdee * (1 - deficitPercent);
  const minimum = 25 * weightKg;
  return round(Math.max(baseTarget, minimum), 0);
}

export function calculateMacroTargets({
  calorieTarget,
  weightKg,
}: {
  calorieTarget: number;
  weightKg: number;
}): { protein: number; carbs: number; fat: number; fiber: number } {
  const protein = round(Math.max(1.8 * weightKg, 80), 0);
  const fat = round(Math.max(0.8 * weightKg, 45), 0);
  const caloriesFromProtein = protein * 4;
  const caloriesFromFat = fat * 9;
  const remainingCalories = Math.max(calorieTarget - caloriesFromProtein - caloriesFromFat, 0);
  const carbs = round(remainingCalories / 4, 0);
  const fiber = round(Math.max(25, weightKg * 0.2), 0);

  return { protein, carbs, fat, fiber };
}

/**
 * Scales nutritional values proportionally from a reference portion (default: 100g)
 */
export function scaleNutritionValues({
  values,
  portionG,
  referenceG = 100,
}: {
  values: NutritionValues;
  portionG: number;
  referenceG?: number;
}): NutritionValues {
  const safePortion = validatePositive(portionG, "portionG");
  const safeReference = validatePositive(referenceG, "referenceG");
  const ratio = safePortion / safeReference;

  return {
    calories: round((values.calories ?? 0) * ratio, 1),
    protein: round((values.protein ?? 0) * ratio, 1),
    carbs: round((values.carbs ?? 0) * ratio, 1),
    fat: round((values.fat ?? 0) * ratio, 1),
    fiber: round((values.fiber ?? 0) * ratio, 1),
  };
}

/**
 * Sums array of meal items into total calories and macronutrients
 */
export function sumMealItems(items: Array<{ nutrition: NutritionValues }>): NutritionValues {
  return items.reduce<NutritionValues>(
    (acc, curr) => ({
      calories: round(acc.calories + (curr.nutrition.calories || 0), 1),
      protein: round(acc.protein + (curr.nutrition.protein || 0), 1),
      carbs: round(acc.carbs + (curr.nutrition.carbs || 0), 1),
      fat: round(acc.fat + (curr.nutrition.fat || 0), 1),
      fiber: round(acc.fiber + (curr.nutrition.fiber || 0), 1),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

/**
 * Analyzes weight history to compute moving average and trend direction
 */
export function calculateWeightTrend(entries: WeightEntry[]): {
  latest: number;
  previous: number | null;
  changeKg: number;
  avgWeightKg: number;
  direction: "up" | "down" | "flat";
  weeklyRateKg: number;
} {
  if (!entries || entries.length === 0) {
    throw new Error("Cần ít nhất một bản ghi cân nặng để tính toán xu hướng.");
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );

  const latest = sorted[sorted.length - 1].weightKg;
  const previous = sorted.length > 1 ? sorted[sorted.length - 2].weightKg : null;
  const changeKg = previous === null ? 0 : round(latest - previous, 1);
  const avgWeightKg = round(
    sorted.reduce((sum, e) => sum + e.weightKg, 0) / sorted.length,
    1,
  );

  let direction: "up" | "down" | "flat" = "flat";
  if (changeKg > 0.1) direction = "up";
  if (changeKg < -0.1) direction = "down";

  // Rate of change over available days
  let weeklyRateKg = 0;
  if (sorted.length >= 2) {
    const first = sorted[0];
    const days = Math.max(
      1,
      (new Date(sorted[sorted.length - 1].recordedAt).getTime() -
        new Date(first.recordedAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const totalChange = latest - first.weightKg;
    weeklyRateKg = round((totalChange / days) * 7, 2);
  }

  return {
    latest: round(latest, 1),
    previous: previous === null ? null : round(previous, 1),
    changeKg,
    avgWeightKg,
    direction,
    weeklyRateKg,
  };
}

export type AiMealCandidate = {
  name: string;
  portionG: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence: number;
  notes?: string;
  isVisible?: boolean;
};

export function validateAiMealCandidate(candidate: AiMealCandidate): AiMealCandidate {
  const name = candidate.name?.trim();
  if (!name) {
    throw new Error("Tên món ăn trong phản hồi AI không được để trống.");
  }

  const safePortion = validatePositive(candidate.portionG, "portionG");
  const safeConfidence = Math.max(0, Math.min(candidate.confidence ?? 0.8, 1));

  return {
    ...candidate,
    name,
    portionG: safePortion,
    confidence: safeConfidence,
    calories: Number.isFinite(candidate.calories) ? Math.max(0, round(candidate.calories, 1)) : 0,
    protein: Number.isFinite(candidate.protein) ? Math.max(0, round(candidate.protein, 1)) : 0,
    carbs: Number.isFinite(candidate.carbs) ? Math.max(0, round(candidate.carbs, 1)) : 0,
    fat: Number.isFinite(candidate.fat) ? Math.max(0, round(candidate.fat, 1)) : 0,
    fiber: Number.isFinite(candidate.fiber) ? Math.max(0, round(candidate.fiber, 1)) : 0,
  };
}

export function validateAiMealResponse(payload: {
  candidates?: AiMealCandidate[];
}): AiMealCandidate[] {
  if (!Array.isArray(payload.candidates) || payload.candidates.length === 0) {
    throw new Error("Phân tích bữa ăn yêu cầu ít nhất một món ăn được nhận diện.");
  }

  return payload.candidates.map(validateAiMealCandidate);
}
