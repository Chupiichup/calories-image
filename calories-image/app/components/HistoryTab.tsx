"use client";

import React from "react";
import { History, Calendar, Flame, Dumbbell, Wheat, Droplet, Sparkles } from "lucide-react";
import {
  getLocalDateString,
  deduplicateMealList,
  type StoredMeal,
  type StoredGoal,
} from "@/lib/db/repository";
import { round } from "@/lib/nutrition";

interface HistoryTabProps {
  meals: StoredMeal[];
  goal: StoredGoal;
}

export function HistoryTab({ meals, goal }: HistoryTabProps) {
  // Deduplicate any repeated meals across history
  const { unique: dedupedMeals } = deduplicateMealList(meals);

  // Group meals by LOCAL date (YYYY-MM-DD)
  const daysMap: Record<
    string,
    { date: string; calories: number; protein: number; carbs: number; fat: number; fiber: number }
  > = {};

  dedupedMeals.forEach((m) => {
    const d = getLocalDateString(m.eatenAt);
    if (!daysMap[d]) {
      daysMap[d] = { date: d, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    }
    (m.items || []).forEach((it) => {
      daysMap[d].calories += Number(it.calories) || 0;
      daysMap[d].protein += Number(it.protein) || 0;
      daysMap[d].carbs += Number(it.carbs) || 0;
      daysMap[d].fat += Number(it.fat) || 0;
      daysMap[d].fiber += Number(it.fiber) || 0;
    });
  });

  const historyDays = Object.values(daysMap).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // Calculate 7-day averages
  const recent7 = historyDays.slice(0, 7);
  const count = recent7.length || 1;
  const avgCals = round(recent7.reduce((sum, d) => sum + d.calories, 0) / count, 0);
  const avgProtein = round(recent7.reduce((sum, d) => sum + d.protein, 0) / count, 1);
  const avgCarbs = round(recent7.reduce((sum, d) => sum + d.carbs, 0) / count, 1);
  const avgFat = round(recent7.reduce((sum, d) => sum + d.fat, 0) / count, 1);
  const avgFiber = round(recent7.reduce((sum, d) => sum + d.fiber, 0) / count, 1);

  return (
    <div className="space-y-6">
      {/* 7-Day Average Overview */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">Trung bình 7 ngày gần nhất</h2>
            <p className="text-xs text-stone-500">Mức nạp dinh dưỡng trung bình theo ngày thực tế</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            Mục tiêu: {goal.dailyCalorieTarget} kcal/ngày
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
          <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-100 text-center">
            <span className="text-[11px] font-semibold text-stone-500">Năng lượng</span>
            <p className="mt-1 text-2xl font-black text-stone-900">{avgCals}</p>
            <span className="text-[10px] text-stone-400">kcal/ngày</span>
          </div>

          <div className="rounded-2xl bg-emerald-50/60 p-3.5 border border-emerald-100 text-center">
            <span className="text-[11px] font-semibold text-emerald-700">Đạm (Protein)</span>
            <p className="mt-1 text-2xl font-black text-emerald-700">{avgProtein}</p>
            <span className="text-[10px] text-emerald-600">g / {goal.dailyProteinTargetG}g</span>
          </div>

          <div className="rounded-2xl bg-amber-50/60 p-3.5 border border-amber-100 text-center">
            <span className="text-[11px] font-semibold text-amber-700">Carb</span>
            <p className="mt-1 text-2xl font-black text-amber-700">{avgCarbs}</p>
            <span className="text-[10px] text-amber-600">g / {goal.dailyCarbTargetG}g</span>
          </div>

          <div className="rounded-2xl bg-rose-50/60 p-3.5 border border-rose-100 text-center">
            <span className="text-[11px] font-semibold text-rose-700">Chất béo</span>
            <p className="mt-1 text-2xl font-black text-rose-700">{avgFat}</p>
            <span className="text-[10px] text-rose-600">g / {goal.dailyFatTargetG}g</span>
          </div>

          <div className="rounded-2xl bg-teal-50/60 p-3.5 border border-teal-100 text-center">
            <span className="text-[11px] font-semibold text-teal-700">Chất xơ</span>
            <p className="mt-1 text-2xl font-black text-teal-700">{avgFiber}</p>
            <span className="text-[10px] text-teal-600">g / {goal.dailyFiberTargetG}g</span>
          </div>
        </div>
      </div>

      {/* Daily History Breakdown Table */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-stone-900">Chi tiết từng ngày</h3>

        {historyDays.length === 0 ? (
          <p className="text-xs text-stone-400 italic text-center py-8">Chưa có lịch sử bữa ăn nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500">
                  <th className="pb-3 font-semibold">Ngày</th>
                  <th className="pb-3 font-semibold">Tổng Calo</th>
                  <th className="pb-3 font-semibold">Đạm (Protein)</th>
                  <th className="pb-3 font-semibold">Carb</th>
                  <th className="pb-3 font-semibold">Chất béo</th>
                  <th className="pb-3 font-semibold">Chất xơ</th>
                  <th className="pb-3 font-semibold text-right">Trạng thái thâm hụt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {historyDays.map((d) => {
                  const diff = goal.dailyCalorieTarget - d.calories;
                  const isSafe = diff >= -150 && diff <= 450;
                  return (
                    <tr key={d.date} className="hover:bg-stone-50 transition">
                      <td className="py-3 font-medium text-stone-800">
                        {new Date(`${d.date}T00:00:00`).toLocaleDateString("vi-VN", {
                          weekday: "short",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 font-bold text-stone-900">{round(d.calories, 0)} kcal</td>
                      <td className="py-3 font-semibold text-emerald-700">{round(d.protein, 0)}g</td>
                      <td className="py-3 text-stone-600">{round(d.carbs, 0)}g</td>
                      <td className="py-3 text-stone-600">{round(d.fat, 0)}g</td>
                      <td className="py-3 text-teal-700">{round(d.fiber, 0)}g</td>
                      <td className="py-3 text-right">
                        {isSafe ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Chuẩn thâm hụt
                          </span>
                        ) : diff < -150 ? (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                            Vượt calo ({round(Math.abs(diff), 0)})
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            Dư thâm hụt
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

