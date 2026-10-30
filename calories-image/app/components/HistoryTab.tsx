"use client";

import React, { useState } from "react";
import { History, Calendar, Flame, Dumbbell, Wheat, Droplet, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
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
  onMergeMeals?: (sourceDate: string, targetDate: string) => Promise<void>;
  onSelectDateForDiary?: (date: string) => void;
}

export function HistoryTab({ meals, goal, onMergeMeals, onSelectDateForDiary }: HistoryTabProps) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  // Deduplicate any repeated meals across history
  const { unique: dedupedMeals } = deduplicateMealList(meals);

  // Group meals by LOCAL date (YYYY-MM-DD in Asia/Ho_Chi_Minh timezone)
  const daysMap: Record<
    string,
    {
      date: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      meals: StoredMeal[];
    }
  > = {};

  dedupedMeals.forEach((m) => {
    const d = getLocalDateString(m.eatenAt);
    if (!daysMap[d]) {
      daysMap[d] = { date: d, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, meals: [] };
    }
    daysMap[d].meals.push(m);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-base font-bold text-stone-900">Chi tiết từng ngày</h3>
          <span className="text-xs text-stone-500">Bấm vào từng ngày để xem chi tiết các món ăn</span>
        </div>

        {/* 1-Click Tool to merge / consolidate days */}
        {historyDays.length > 1 && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
              <h4 className="text-xs font-bold text-emerald-950">
                Gom toàn bộ bữa ăn về một ngày (Giờ Việt Nam)
              </h4>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Bạn đang có {historyDays.length} ngày ghi nhận do các bữa ăn được chụp hoặc lưu qua mốc nửa đêm (sau 00:00).
              Bạn có thể gom toàn bộ các bữa ăn về cùng một ngày:
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {historyDays.map((d) => {
                const [y, m, day] = d.date.split("-").map(Number);
                const dateObj = new Date(y, m - 1, day, 12, 0, 0);
                const dayLabel = dateObj.toLocaleDateString("vi-VN", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                });
                return (
                  <button
                    key={d.date}
                    type="button"
                    disabled={isMerging}
                    onClick={async () => {
                      if (!onMergeMeals) return;
                      setIsMerging(true);
                      try {
                        const otherDays = historyDays.filter((x) => x.date !== d.date);
                        for (const o of otherDays) {
                          await onMergeMeals(o.date, d.date);
                        }
                      } finally {
                        setIsMerging(false);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm hover:bg-emerald-600 hover:text-white transition active:scale-95 disabled:opacity-50"
                  >
                    <span>👉 Gom tất cả về {dayLabel} ({round(d.calories, 0)} kcal)</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
                  const isOver = diff < 0;
                  const isSafe = diff >= 0 && diff <= 300;
                  const isExpanded = expandedDate === d.date;

                  return (
                    <React.Fragment key={d.date}>
                      <tr
                        onClick={() => setExpandedDate(isExpanded ? null : d.date)}
                        className="hover:bg-stone-50 transition cursor-pointer select-none"
                      >
                        <td className="py-3 font-semibold text-stone-800 flex items-center gap-1.5">
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                          )}
                          <span>
                            {(() => {
                              const [y, m, day] = d.date.split("-").map(Number);
                              const dateObj = new Date(y, m - 1, day, 12, 0, 0);
                              return dateObj.toLocaleDateString("vi-VN", {
                                timeZone: "Asia/Ho_Chi_Minh",
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              });
                            })()}
                          </span>
                        </td>
                        <td className="py-3 font-bold text-stone-900">{round(d.calories, 0)} kcal</td>
                        <td className="py-3 font-semibold text-emerald-700">{round(d.protein, 0)}g</td>
                        <td className="py-3 text-stone-600">{round(d.carbs, 0)}g</td>
                        <td className="py-3 text-stone-600">{round(d.fat, 0)}g</td>
                        <td className="py-3 text-teal-700">{round(d.fiber, 0)}g</td>
                        <td className="py-3 text-right">
                          {d.calories === 0 ? (
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                              Chưa nạp calo
                            </span>
                          ) : isOver ? (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                              Vượt calo (+{round(Math.abs(diff), 0)})
                            </span>
                          ) : isSafe ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                              Chuẩn thâm hụt
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                              Dư thâm hụt (còn {round(diff, 0)})
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded View: List of meals on this day */}
                      {isExpanded && (
                        <tr className="bg-stone-50/90">
                          <td colSpan={7} className="p-4">
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between pb-1.5 border-b border-stone-200">
                                <span className="font-bold text-stone-800 text-xs">
                                  Các bữa ăn trong ngày ({d.meals.length} bữa ăn):
                                </span>
                                {onSelectDateForDiary && (
                                  <button
                                    onClick={() => onSelectDateForDiary(d.date)}
                                    className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                                  >
                                    <span>Mở chi tiết tại Nhật ký</span>
                                    <span>&rarr;</span>
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                {d.meals.map((m) => {
                                  const mealCalories = m.items.reduce((s, it) => s + (it.calories || 0), 0);
                                  const mealProtein = m.items.reduce((s, it) => s + (it.protein || 0), 0);
                                  const mealLabel =
                                    m.mealType === "breakfast"
                                      ? "Bữa sáng"
                                      : m.mealType === "lunch"
                                        ? "Bữa trưa"
                                        : m.mealType === "dinner"
                                          ? "Bữa tối"
                                          : "Bữa phụ";

                                  return (
                                    <div
                                      key={m.id}
                                      className="rounded-xl border border-stone-200 bg-white p-3 text-xs space-y-1.5 shadow-2xs"
                                    >
                                      <div className="flex items-center justify-between text-stone-500 font-medium text-[11px]">
                                        <span className="font-bold text-stone-700">
                                          {mealLabel} • {new Date(m.eatenAt).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                        <span className="font-bold text-stone-900">
                                          {round(mealCalories, 0)} kcal
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-stone-700 space-y-0.5">
                                        {m.items.map((it) => (
                                          <p key={it.id} className="truncate">
                                            • <strong className="font-semibold">{it.foodNameSnapshot}</strong> ({it.portionG}g)
                                          </p>
                                        ))}
                                      </div>
                                      <div className="pt-1 text-[10px] text-emerald-700 font-medium border-t border-stone-100 flex items-center justify-between">
                                        <span>Đạm: {round(mealProtein, 1)}g</span>
                                        {m.analysisStatus === "ai_confirmed" && (
                                          <span className="rounded bg-emerald-50 px-1 text-emerald-800 font-bold">
                                            AI Vision
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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

