import type { StoredMeal, StoredGoal } from "@/lib/db/repository";
import { round } from "@/lib/nutrition";

export type CoachingInsight = {
  type: "positive" | "warning" | "tip";
  title: string;
  message: string;
  actionableStep?: string;
};

/**
 * Generates evidence-based, deterministic coaching insights based on the user's
 * actual logged meals, caloric targets, and macronutrient balance.
 */
export function generateNutritionCoachingInsights(params: {
  todayMeals: StoredMeal[];
  goal: StoredGoal;
}): CoachingInsight[] {
  const { todayMeals, goal } = params;
  const insights: CoachingInsight[] = [];

  // Calculate today's totals
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;

  for (const meal of todayMeals) {
    for (const item of meal.items) {
      totalCalories += item.calories;
      totalProtein += item.protein;
      totalCarbs += item.carbs;
      totalFat += item.fat;
      totalFiber += item.fiber;
    }
  }

  const calorieDiff = goal.dailyCalorieTarget - totalCalories;
  const proteinDiff = goal.dailyProteinTargetG - totalProtein;
  const fiberDiff = goal.dailyFiberTargetG - totalFiber;

  // 1. Protein analysis (Muscle sparing during deficit)
  if (totalProtein < goal.dailyProteinTargetG * 0.7 && todayMeals.length >= 2) {
    insights.push({
      type: "warning",
      title: "Cần bổ sung đạm để bảo vệ cơ bắp",
      message: `Hôm nay bạn mới nạp ${round(totalProtein, 0)}g đạm (mục tiêu ${goal.dailyProteinTargetG}g). Khi cơ thể ở trạng thái thâm hụt calo, việc thiếu protein có thể khiến cơ thể phân giải mô cơ thay vì đốt mỡ.`,
      actionableStep:
        "Gợi ý: Thêm 1 đĩa ức gà áp chảo (150g ~ 46g đạm), 2 quả trứng gà luộc (~13g đạm) hoặc 1 hộp sữa chua Hy Lạp/không đường.",
    });
  } else if (totalProtein >= goal.dailyProteinTargetG * 0.9) {
    insights.push({
      type: "positive",
      title: "Lượng đạm rất tối ưu!",
      message: `Bạn đã nạp ${round(totalProtein, 0)}g protein hôm nay, đạt mục tiêu bảo tồn khối cơ nạc và tăng cảm giác no lâu.`,
    });
  }

  // 2. Fiber analysis (Digestion & Satiety)
  if (fiberDiff > 10 && todayMeals.length >= 2) {
    insights.push({
      type: "tip",
      title: "Tăng cường chất xơ cho hệ tiêu hóa",
      message: `Lượng chất xơ hôm nay đạt ${round(totalFiber, 0)}g / ${goal.dailyFiberTargetG}g mục tiêu. Chất xơ giúp làm chậm hấp thu đường và duy trì hệ vi sinh đường ruột khỏe mạnh.`,
      actionableStep:
        "Gợi ý món Việt: Thêm 1 đĩa rau muống luộc, canh rau ngót hoặc ăn thêm 1 quả ổi/táo tráng miệng.",
    });
  }

  // 3. Calorie deficit status
  if (calorieDiff < -200) {
    insights.push({
      type: "warning",
      title: "Đã vượt ngưỡng calo mục tiêu",
      message: `Hôm nay bạn đã vượt ~${round(Math.abs(calorieDiff), 0)} kcal so với kế hoạch thâm hụt. Đừng nản lòng hay nhịn ăn bù vào ngày mai; hãy duy trì sinh hoạt bình thường và đi bộ thêm 20-30 phút nếu thuận tiện.`,
      actionableStep: "Uống thêm nước lọc, ăn tối nhẹ nhàng với canh rau và đạm nạc.",
    });
  } else if (calorieDiff >= 0 && calorieDiff <= 400 && todayMeals.length >= 2) {
    insights.push({
      type: "positive",
      title: "Thâm hụt calo hoàn hảo",
      message: `Bạn đang kiểm soát năng lượng rất tốt, còn ${round(calorieDiff, 0)} kcal cho các bữa phụ hoặc bữa nhẹ tối.`,
    });
  }

  // Fallback default helpful insight if few meals logged
  if (insights.length === 0) {
    insights.push({
      type: "tip",
      title: "Bí quyết duy trì năng lượng",
      message:
        "Phân chia lượng đạm đều vào 3 bữa chính (khoảng 30-40g đạm mỗi bữa) giúp tổng hợp cơ bắp liên tục và hạn chế cảm giác thèm ăn vặt buổi tối.",
      actionableStep: "Chụp ảnh bữa ăn tiếp theo để AI hỗ trợ ước lượng khẩu phần tự động!",
    });
  }

  return insights;
}

