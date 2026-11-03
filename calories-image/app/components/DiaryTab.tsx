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
  Edit3,
  Lock,
} from "lucide-react";
import {
  StoredMeal,
  StoredMealItem,
  StoredGoal,
  getLocalDateString,
  formatToVietnamDateTimeLocal,
  vietnamDateTimeLocalToIso,
} from "@/lib/db/repository";
import { round } from "@/lib/nutrition";
import { DailyActivityCard } from "./DailyActivityCard";

interface DiaryTabProps {
  meals: StoredMeal[];
  goal: StoredGoal;
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  onOpenMealLog: (mode: "photo" | "manual") => void;
  onDeleteMeal: (mealId: string) => Promise<void>;
  onViewSuggestions?: (category: "breakfast" | "lunch" | "afternoon" | "dinner" | "snack") => void;
  onUpdateMeal?: (
    mealId: string,
    updates: {
      eatenAt?: string;
      mealType?: "breakfast" | "lunch" | "dinner" | "snack";
      notes?: string;
      items?: StoredMealItem[];
    },
  ) => Promise<void>;
}

export function DiaryTab({
  meals,
  goal,
  selectedDate,
  onDateChange,
  onOpenMealLog,
  onDeleteMeal,
  onViewSuggestions,
  onUpdateMeal,
}: DiaryTabProps) {
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editTimeVal, setEditTimeVal] = useState<string>("");
  const [editTypeVal, setEditTypeVal] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [editItems, setEditItems] = useState<StoredMealItem[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const handleStartEdit = (meal: StoredMeal) => {
    setEditingMealId(meal.id);
    setEditTimeVal(formatToVietnamDateTimeLocal(new Date(meal.eatenAt)));
    setEditTypeVal(meal.mealType);
    setEditItems(meal.items.map((it) => ({ ...it })));
  };

  const handleUpdatePortion = (itemId: string, newG: number) => {
    const clampedG = Math.max(1, Math.min(3000, Math.round(newG)));
    setEditItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const oldG = Math.max(1, it.portionG || 100);
        const factor = clampedG / oldG;
        return {
          ...it,
          portionG: clampedG,
          calories: Math.max(0, round(it.calories * factor, 1)),
          protein: Math.max(0, round(it.protein * factor, 1)),
          carbs: Math.max(0, round(it.carbs * factor, 1)),
          fat: Math.max(0, round(it.fat * factor, 1)),
          fiber: Math.max(0, round(it.fiber * factor, 1)),
          addedSugarG: it.addedSugarG !== undefined ? Math.max(0, round(it.addedSugarG * factor, 1)) : 0,
          totalSugarG: it.totalSugarG !== undefined ? Math.max(0, round(it.totalSugarG * factor, 1)) : 0,
        };
      }),
    );
  };

  const handleRemoveItem = (itemId: string) => {
    if (editItems.length <= 1) return;
    setEditItems((prev) => prev.filter((it) => it.id !== itemId));
  };
  // Navigation helpers for dates
  const handlePrevDay = () => {
    const current = new Date(`${selectedDate}T12:00:00`);
    current.setDate(current.getDate() - 1);
    onDateChange(getLocalDateString(current));
  };

  const handleNextDay = () => {
    const current = new Date(`${selectedDate}T12:00:00`);
    current.setDate(current.getDate() + 1);
    onDateChange(getLocalDateString(current));
  };

  const handleToday = () => {
    onDateChange(getLocalDateString());
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
  let totalAddedSugar = 0;

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
      if (it.addedSugarG) totalAddedSugar += it.addedSugarG;
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
          {totalAddedSugar > 0 && (
            <div className="border-l border-stone-200 pl-4 hidden md:block">
              <span>Đường thêm: </span>
              <strong className={totalAddedSugar > 25 ? "text-rose-600 font-bold" : "text-amber-700 font-bold"}>
                +{round(totalAddedSugar, 1)}g
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* Daily Physical Activity Card */}
      <DailyActivityCard selectedDate={selectedDate} />

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
                <div className="flex items-center gap-2">
                  {onViewSuggestions && (
                    <button
                      type="button"
                      onClick={() => onViewSuggestions(groupKey === "snack" ? "snack" : (groupKey as any))}
                      className="flex items-center gap-1 rounded-xl bg-stone-100 hover:bg-emerald-50 hover:text-emerald-700 px-2.5 py-1 text-xs font-semibold text-stone-600 transition"
                      title="Xem các món gợi ý phù hợp cho bữa này"
                    >
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      <span>Gợi ý món</span>
                    </button>
                  )}
                  <button
                    onClick={() => onOpenMealLog("photo")}
                    className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Thêm món</span>
                  </button>
                </div>
              </div>

              {group.meals.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-2">Chưa ghi nhận món ăn nào cho bữa này.</p>
              ) : (
                <div className="space-y-3">
                  {group.meals.map((meal) => {
                    const mealAgeHours = (Date.now() - new Date(meal.eatenAt).getTime()) / (1000 * 60 * 60);
                    const canEditPortion = mealAgeHours <= 24 && mealAgeHours >= -2;

                    return (
                      <div
                        key={meal.id}
                        className="rounded-2xl border border-stone-100 bg-stone-50/60 p-3 space-y-2 hover:bg-stone-50 transition"
                      >
                        {editingMealId === meal.id ? (
                          <div className="rounded-xl border border-emerald-300 bg-white p-3.5 space-y-3 shadow-sm">
                            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                              <span className="text-xs font-bold text-stone-900">Chỉnh sửa bữa ăn:</span>
                              <span className="text-[10px] text-emerald-700 font-medium">Giờ Việt Nam (UTC+7)</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="text-[10px] text-stone-500 font-semibold block mb-0.5">Ngày & giờ dùng bữa:</label>
                                <input
                                  type="datetime-local"
                                  value={editTimeVal}
                                  onChange={(e) => setEditTimeVal(e.target.value)}
                                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-stone-500 font-semibold block mb-0.5">Loại bữa:</label>
                                <select
                                  value={editTypeVal}
                                  onChange={(e) => setEditTypeVal(e.target.value as any)}
                                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                                >
                                  <option value="breakfast">Bữa sáng</option>
                                  <option value="lunch">Bữa trưa</option>
                                  <option value="dinner">Bữa tối</option>
                                  <option value="snack">Bữa phụ & Ăn vặt</option>
                                </select>
                              </div>
                            </div>

                            {/* Portion Editing Section */}
                            <div className="pt-2 border-t border-stone-100 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-stone-800">
                                  Định lượng các món ({editItems.length}):
                                </span>
                                {canEditPortion ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                                    <Sparkles className="h-3 w-3 text-emerald-600" />
                                    Cho phép sửa định lượng (trong 24h)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500 border border-stone-200" title="Bữa ăn quá 24h đã được chốt định lượng">
                                    <Lock className="h-3 w-3 text-stone-400" />
                                    Định lượng đã chốt (quá 24h)
                                  </span>
                                )}
                              </div>

                              <div className="space-y-2 divide-y divide-stone-100">
                                {editItems.map((it) => (
                                  <div key={it.id} className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                    <div className="flex-1">
                                      <span className="font-semibold text-stone-800">{it.foodNameSnapshot}</span>
                                      <div className="text-[11px] text-stone-500">
                                        {round(it.calories, 0)} kcal • {round(it.protein, 1)}g đạm
                                      </div>
                                    </div>

                                    {canEditPortion ? (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleUpdatePortion(it.id, it.portionG - 50)}
                                          disabled={it.portionG <= 50}
                                          className="rounded-lg border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-600 hover:bg-stone-100 disabled:opacity-40"
                                        >
                                          -50
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdatePortion(it.id, it.portionG - 10)}
                                          disabled={it.portionG <= 10}
                                          className="rounded-lg border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-600 hover:bg-stone-100 disabled:opacity-40"
                                        >
                                          -10
                                        </button>
                                        <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg px-2 py-0.5">
                                          <input
                                            type="number"
                                            min={1}
                                            max={3000}
                                            value={it.portionG}
                                            onChange={(e) => handleUpdatePortion(it.id, Number(e.target.value) || 1)}
                                            className="w-12 bg-transparent text-center text-xs font-bold text-stone-900 focus:outline-none"
                                          />
                                          <span className="text-[10px] text-stone-500 font-semibold">g</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdatePortion(it.id, it.portionG + 10)}
                                          className="rounded-lg border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-600 hover:bg-stone-100"
                                        >
                                          +10
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdatePortion(it.id, it.portionG + 50)}
                                          className="rounded-lg border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-600 hover:bg-stone-100"
                                        >
                                          +50
                                        </button>
                                        {editItems.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveItem(it.id)}
                                            className="p-1 text-stone-400 hover:text-rose-600 transition ml-1"
                                            title="Bỏ món này khỏi bữa ăn"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200">
                                        {it.portionG}g
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Total After Edit */}
                              <div className="rounded-xl bg-stone-50 p-2 flex items-center justify-between text-xs border border-stone-200/60 mt-1">
                                <span className="text-[11px] font-semibold text-stone-600">Tổng bữa sau chỉnh sửa:</span>
                                <span className="font-bold text-stone-900">
                                  <strong className="text-emerald-700">
                                    {round(editItems.reduce((s, it) => s + (it.calories || 0), 0), 0)} kcal
                                  </strong>{" "}
                                  • {round(editItems.reduce((s, it) => s + (it.protein || 0), 0), 1)}g đạm
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100">
                              <button
                                type="button"
                                disabled={isSavingEdit}
                                onClick={() => setEditingMealId(null)}
                                className="rounded-xl px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100 transition disabled:opacity-50"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                disabled={isSavingEdit}
                                onClick={async () => {
                                  if (onUpdateMeal) {
                                    setIsSavingEdit(true);
                                    try {
                                      await onUpdateMeal(meal.id, {
                                        eatenAt: vietnamDateTimeLocalToIso(editTimeVal),
                                        mealType: editTypeVal,
                                        items: canEditPortion ? editItems : undefined,
                                      });
                                    } finally {
                                      setIsSavingEdit(false);
                                    }
                                  }
                                  setEditingMealId(null);
                                }}
                                className="rounded-xl bg-emerald-600 px-3.5 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {isSavingEdit && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-r-transparent" />}
                                <span>Lưu thay đổi</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 font-medium text-stone-500">
                                  <Clock className="h-3 w-3" />
                                  {new Date(meal.eatenAt).toLocaleTimeString("vi-VN", {
                                    timeZone: "Asia/Ho_Chi_Minh",
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

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleStartEdit(meal)}
                                  className="flex items-center gap-1 text-stone-400 hover:text-emerald-700 transition"
                                  title="Chỉnh sửa bữa ăn (giờ, loại bữa & định lượng)"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                  <span className="text-[10px] hidden sm:inline">Sửa</span>
                                </button>
                                <button
                                  onClick={() => onDeleteMeal(meal.id)}
                                  className="text-stone-400 hover:text-rose-600 transition"
                                  title="Xóa bữa ăn này"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Food Items in Meal */}
                            <div className="divide-y divide-stone-100">
                              {meal.items.map((item) => (
                                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-1.5 text-xs gap-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-semibold text-stone-800">{item.foodNameSnapshot}</span>
                                    <span className="text-stone-500">({item.portionG}g)</span>
                                    {item.addedSugarG !== undefined && item.addedSugarG > 0 && (
                                      <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 border border-amber-200">
                                        🍬 +{item.addedSugarG}g đường
                                      </span>
                                    )}
                                    {item.giCategory === "high" && (
                                      <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 border border-rose-200">
                                        ⚡ GI cao
                                      </span>
                                    )}
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
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

