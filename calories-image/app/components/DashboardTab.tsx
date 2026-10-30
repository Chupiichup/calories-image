"use client";

import React from "react";
import {
  Camera,
  Plus,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  CheckCircle2,
  Clock,
  ChevronRight,
} from "lucide-react";
import type { StoredMeal, StoredGoal, StoredWeightEntry, StoredProfile } from "@/lib/db/repository";
import type { CoachingInsight } from "@/lib/coaching";
import { round } from "@/lib/nutrition";

interface DashboardTabProps {
  profile: StoredProfile;
  goal: StoredGoal;
  todayMeals: StoredMeal[];
  recentWeights: StoredWeightEntry[];
  coachingInsights: CoachingInsight[];
  onOpenMealLog: (mode: "photo" | "manual") => void;
  onSelectTab: (tab: any) => void;
}

export function DashboardTab({
  profile,
  goal,
  todayMeals,
  recentWeights,
  coachingInsights,
  onOpenMealLog,
  onSelectTab,
}: DashboardTabProps) {
  // Aggregate today's macros
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;

  todayMeals.forEach((meal) => {
    meal.items.forEach((item) => {
      totalCalories += item.calories;
      totalProtein += item.protein;
      totalCarbs += item.carbs;
      totalFat += item.fat;
      totalFiber += item.fiber;
    });
  });

  const remainingCalories = goal.dailyCalorieTarget - totalCalories;
  const caloriePercent = Math.min(Math.round((totalCalories / goal.dailyCalorieTarget) * 100), 100);

  // Weight trend calculation
  const latestWeight = recentWeights.length > 0 ? recentWeights[recentWeights.length - 1].weightKg : goal.currentWeightKg;
  const prevWeight = recentWeights.length > 1 ? recentWeights[recentWeights.length - 2].weightKg : null;
  const weightDelta = prevWeight !== null ? round(latestWeight - prevWeight, 1) : 0;

  const topInsight = coachingInsights[0];

  const macros = [
    {
      label: "Đạm (Protein)",
      current: round(totalProtein, 0),
      target: goal.dailyProteinTargetG,
      unit: "g",
      color: "bg-emerald-500",
      lightColor: "bg-emerald-100",
      textColor: "text-emerald-700",
      icon: Dumbbell,
      note: "Bảo tồn cơ nạc",
    },
    {
      label: "Tinh bột (Carb)",
      current: round(totalCarbs, 0),
      target: goal.dailyCarbTargetG,
      unit: "g",
      color: "bg-amber-500",
      lightColor: "bg-amber-100",
      textColor: "text-amber-700",
      icon: Wheat,
      note: "Năng lượng tập",
    },
    {
      label: "Chất béo (Fat)",
      current: round(totalFat, 0),
      target: goal.dailyFatTargetG,
      unit: "g",
      color: "bg-rose-500",
      lightColor: "bg-rose-100",
      textColor: "text-rose-700",
      icon: Droplet,
      note: "Hormone thiết yếu",
    },
    {
      label: "Chất xơ (Fiber)",
      current: round(totalFiber, 0),
      target: goal.dailyFiberTargetG,
      unit: "g",
      color: "bg-teal-500",
      lightColor: "bg-teal-100",
      textColor: "text-teal-700",
      icon: Sparkles,
      note: "Tiêu hóa & No lâu",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: Today's Calorie Target & Remaining */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 sm:p-8 text-white shadow-xl shadow-emerald-900/15">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-100 backdrop-blur-md">
              <Flame className="h-3.5 w-3.5 text-lime-300" />
              <span>Mục tiêu thâm hụt giảm mỡ hôm nay</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-black tracking-tight">{goal.dailyCalorieTarget}</span>
              <span className="text-lg font-medium text-emerald-200">kcal</span>
            </div>
            <p className="text-xs text-emerald-100/90 max-w-md">
              Thiết kế theo công thức Mifflin-St Jeor với tốc độ giảm an toàn ({goal.weightLossPace === "slow" ? "Chậm 15%" : goal.weightLossPace === "aggressive" ? "Nhanh 25%" : "Vừa phải 20%"}).
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:min-w-[280px]">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-md border border-white/10">
              <span className="text-xs font-medium text-emerald-200 uppercase tracking-wider">Đã nạp</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold">{round(totalCalories, 0)}</span>
                <span className="text-xs text-emerald-200">kcal</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-white/20">
                <div
                  className="h-1.5 rounded-full bg-lime-300 transition-all duration-500"
                  style={{ width: `${caloriePercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-md border border-white/10">
              <span className="text-xs font-medium text-emerald-200 uppercase tracking-wider">Còn lại</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className={`text-2xl sm:text-3xl font-bold ${remainingCalories < 0 ? "text-amber-300" : ""}`}>
                  {round(remainingCalories, 0)}
                </span>
                <span className="text-xs text-emerald-200">kcal</span>
              </div>
              <span className="text-[11px] text-emerald-100/80">
                {remainingCalories >= 0 ? "Trong ngưỡng thâm hụt" : "Vượt ngưỡng hôm nay"}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="relative z-10 mt-6 pt-6 border-t border-white/15 flex flex-wrap gap-3">
          <button
            onClick={() => onOpenMealLog("photo")}
            className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-emerald-800 shadow-md hover:bg-emerald-50 transition active:scale-95"
          >
            <Camera className="h-4 w-4 text-emerald-600" />
            <span>Chụp ảnh món ăn (AI Vision)</span>
          </button>
          <button
            onClick={() => onOpenMealLog("manual")}
            className="flex items-center gap-2 rounded-2xl bg-emerald-800/80 hover:bg-emerald-800 border border-white/20 px-4 py-3 text-sm font-semibold text-white transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Nhập thủ công</span>
          </button>
        </div>
      </section>

      {/* Macronutrient Breakdown Cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-stone-900">Phân bổ Đa lượng (Macros)</h2>
          <span className="text-xs text-stone-500">Mục tiêu ưu tiên Protein cao để giữ cơ</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {macros.map((m) => {
            const pct = Math.min(Math.round((m.current / m.target) * 100), 100);
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-500">{m.label}</span>
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${m.lightColor}`}>
                    <Icon className={`h-4 w-4 ${m.textColor}`} />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-stone-900">{m.current}</span>
                  <span className="text-xs text-stone-500">/{m.target}{m.unit}</span>
                </div>

                <div className="mt-2 h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                  <div className={`h-full rounded-full ${m.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
                  <span>{pct}%</span>
                  <span>{m.note}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Grid: Coaching Advice & Recent Meals & Weight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Logged Meals (2 Cols) */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Bữa ăn hôm nay</h2>
              <p className="text-xs text-stone-500">{todayMeals.length} bữa ăn đã được ghi nhận</p>
            </div>
            <button
              onClick={() => onSelectTab("diary")}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              <span>Xem toàn bộ nhật ký</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {todayMeals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
              <Camera className="mx-auto h-10 w-10 text-stone-400" />
              <h3 className="mt-3 text-sm font-semibold text-stone-900">Chưa ghi nhận bữa ăn nào hôm nay</h3>
              <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
                Chụp ảnh bữa ăn của bạn hoặc chọn từ danh mục món ăn Việt Nam để tự động tính calo và đạm.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <button
                  onClick={() => onOpenMealLog("photo")}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700"
                >
                  Chụp ảnh ngay
                </button>
                <button
                  onClick={() => onOpenMealLog("manual")}
                  className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  Nhập món thủ công
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {todayMeals.map((meal) => {
                let mealCals = 0;
                let mealProtein = 0;
                meal.items.forEach((it) => {
                  mealCals += it.calories;
                  mealProtein += it.protein;
                });

                const mealTypeLabel: Record<string, string> = {
                  breakfast: "Bữa sáng",
                  lunch: "Bữa trưa",
                  dinner: "Bữa tối",
                  snack: "Bữa phụ",
                };

                const eatenTime = new Date(meal.eatenAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={meal.id}
                    className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-emerald-200"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900">
                            {mealTypeLabel[meal.mealType] || meal.mealType}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-stone-500">
                            <Clock className="h-3 w-3" />
                            {eatenTime}
                          </span>
                          {meal.analysisStatus === "ai_confirmed" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                              <Sparkles className="h-2.5 w-2.5" />
                              AI Vision
                            </span>
                          )}
                        </div>
                        {meal.notes && <p className="mt-1 text-xs text-stone-500 italic">{meal.notes}</p>}
                      </div>

                      <div className="text-right">
                        <span className="text-base font-bold text-stone-900">{round(mealCals, 0)} kcal</span>
                        <p className="text-xs text-emerald-600 font-medium">{round(mealProtein, 1)}g đạm</p>
                      </div>
                    </div>

                    {/* Meal items preview */}
                    <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-stone-100">
                      {meal.items.map((it) => (
                        <span
                          key={it.id}
                          className="inline-flex items-center rounded-lg bg-stone-100 px-2.5 py-1 text-xs text-stone-700"
                        >
                          {it.foodNameSnapshot} ({it.portionG}g)
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Column: Coaching Insights & Weight Snapshot */}
        <aside className="space-y-6">
          {/* Coaching Advice Card */}
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/80 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-800">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Huấn luyện viên Dinh dưỡng AI</span>
            </div>

            {topInsight && (
              <div className="mt-3">
                <h3 className="text-base font-bold text-stone-900">{topInsight.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-700">{topInsight.message}</p>
                {topInsight.actionableStep && (
                  <div className="mt-3 rounded-xl bg-white p-3 border border-emerald-200/80 text-xs font-medium text-emerald-900 shadow-sm">
                    {topInsight.actionableStep}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Weight & Body Stats Card */}
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Cân nặng gần nhất</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-stone-900">{latestWeight}</span>
                  <span className="text-xs text-stone-500">kg</span>
                </div>
              </div>

              {weightDelta !== 0 && (
                <div
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                    weightDelta < 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {weightDelta < 0 ? (
                    <TrendingDown className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5" />
                  )}
                  <span>{weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-stone-500">Mục tiêu:</span>
                <p className="font-semibold text-stone-800">{goal.goalWeightKg} kg</p>
              </div>
              <div>
                <span className="text-stone-500">Còn lại:</span>
                <p className="font-semibold text-emerald-600">
                  {round(Math.abs(latestWeight - goal.goalWeightKg), 1)} kg
                </p>
              </div>
            </div>

            <button
              onClick={() => onSelectTab("weight")}
              className="mt-4 w-full rounded-xl border border-stone-200 bg-stone-50 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
            >
              Ghi nhận cân nặng mới
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

