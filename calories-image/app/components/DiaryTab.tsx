"use client";

import React, { useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Flame,
} from "lucide-react";
import type { StoredMeal, StoredGoal } from "@/lib/db/repository";
import { round } from "@/lib/nutrition";

interface DiaryTabProps {
  meals: StoredMeal[];
  goal: StoredGoal;
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  onOpenMealLog: (mode: "photo" | "manual") => void;
  onDeleteMeal: (mealId: string) => Promise<void>;
}

export function DiaryTab({
  meals,
  goal,
  selectedDate,
  onDateChange,
  onOpenMealLog,
  onDeleteMeal,
}: DiaryTabProps) {
  // Navigation helpers for dates
  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    onDateChange(current.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    onDateChange(current.toISOString().split("T")[0]);
  };

  const handleToday = () => {
    onDateChange(new Date().toISOString().split("T")[0]);
  };

  // Group meals by mealType
  const mealGroups: Record<string, { label: string; meals: StoredMeal[] }> = {
    breakfast: { label: "Bữa sáng", meals: [] },
    lunch: { label: "Bữa trưa", meals: [] },
    dinner: { label: "Bữa tối", meals: [] },
    snack: { label: "Bữa phụ & Ăn vặt", meals: [] },
  };

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;

  meals.forEach((m) => {
    if (mealGroups[m.mealType]) {
      mealGroups[m.mealType].meals.push(m);
    } else {
      mealGroups.snack.meals.push(m);
    }

    m.items.forEach((it) => {
      totalCalories += it.calories;
      totalProtein += it.protein;
      totalCarbs += it.carbs;
      totalFat += it.fat;
      totalFiber += it.fiber;
    });
  });

  const formattedDate = new Date(selectedDate).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Date Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDay}
            className="rounded-xl border border-stone-200 p-2 text-stone-600 hover:bg-stone-50 transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 px-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-bold text-stone-900 capitalize">{formattedDate}</span>
          </div>
          <button
            onClick={handleNextDay}
            className="rounded-xl border border-stone-200 p-2 text-stone-600 hover:bg-stone-50 transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={handleToday}
            className="rounded-xl bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200 transition"
          >
            Hôm nay
          </button>
        </div>

        {/* Daily Summary Pill */}
        <div className="flex items-center gap-4 text-xs font-medium text-stone-600 bg-stone-50 px-4 py-2 rounded-2xl border border-stone-200">
          <div>
            <span>Nạp: </span>
            <strong className="text-stone-900 font-bold">{round(totalCalories, 0)}</strong> / {goal.dailyCalorieTarget} kcal
          </div>
          <div className="border-l border-stone-200 pl-4">
            <span>Đạm: </span>
            <strong className="text-emerald-700 font-bold">{round(totalProtein, 0)}g</strong> / {goal.dailyProteinTargetG}g
          </div>
        </div>
      </div>

      {/* Meal Group Cards */}
      <div className="space-y-4">
        {Object.entries(mealGroups).map(([groupKey, group]) => {
          const groupCalories = group.meals.reduce(
            (sum, m) => sum + m.items.reduce((itemSum, it) => itemSum + it.calories, 0),
            0,
          );
          const groupProtein = group.meals.reduce(
            (sum, m) => sum + m.items.reduce((itemSum, it) => itemSum + it.protein, 0),
            0,
          );

          return (
            <div key={groupKey} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-stone-900 text-base">{group.label}</h3>
                  <span className="text-xs text-stone-500 font-medium">
                    {round(groupCalories, 0)} kcal • {round(groupProtein, 1)}g đạm
                  </span>
                </div>
                <button
                  onClick={() => onOpenMealLog("photo")}
                  className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Thêm món</span>
                </button>
              </div>

              {group.meals.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-2">Chưa ghi nhận món ăn nào cho bữa này.</p>
              ) : (
                <div className="space-y-3">
                  {group.meals.map((meal) => (
                    <div
                      key={meal.id}
                      className="rounded-2xl border border-stone-100 bg-stone-50/60 p-3 space-y-2 hover:bg-stone-50 transition"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 font-medium text-stone-500">
                            <Clock className="h-3 w-3" />
                            {new Date(meal.eatenAt).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {meal.analysisStatus === "ai_confirmed" && (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              <Sparkles className="h-2.5 w-2.5" />
                              AI Vision
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => onDeleteMeal(meal.id)}
                          className="text-stone-400 hover:text-rose-600 transition"
                          title="Xóa bữa ăn này"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Food Items in Meal */}
                      <div className="divide-y divide-stone-100">
                        {meal.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between py-1.5 text-xs">
                            <div>
                              <span className="font-semibold text-stone-800">{item.foodNameSnapshot}</span>
                              <span className="ml-2 text-stone-500">({item.portionG}g)</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-stone-500 text-[11px]">{round(item.protein, 1)}g đạm</span>
                              <strong className="text-stone-900 font-bold">{round(item.calories, 0)} kcal</strong>
                            </div>
                          </div>
                        ))}
                      </div>

                      {meal.notes && (
                        <p className="text-[11px] text-stone-500 italic pt-1 border-t border-stone-200/40">
                          {meal.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

