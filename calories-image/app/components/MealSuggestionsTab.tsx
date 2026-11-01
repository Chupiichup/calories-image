"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Clock,
  Flame,
  CheckCircle2,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Utensils,
  Plus,
  BookOpen,
  Info,
  HeartPulse,
  Search,
  X,
  ChefHat,
  Leaf,
  ShieldCheck,
  Check,
} from "lucide-react";
import {
  SUGGESTED_DISHES,
  MEAL_CATEGORY_INFO,
  getCurrentMealTimeCategory,
  getPersonalizedDishScore,
  filterAndSortDishes,
  type SuggestedDish,
  type MealTimeCategory,
  type DishFilterOption,
  type DishSortOption,
  type DietaryTag,
} from "@/lib/data/mealSuggestionsData";
import { type StoredProfile, type StoredGoal } from "@/lib/db/repository";
import { type MetabolicPreferences } from "@/lib/metabolic";
import { round } from "@/lib/nutrition";

interface MealSuggestionsTabProps {
  initialCategory?: MealTimeCategory;
  profile: StoredProfile | null;
  goal: StoredGoal | null;
  metabolicPrefs: MetabolicPreferences | null;
  onLogDish: (dish: SuggestedDish, options?: { customizeFirst?: boolean }) => Promise<void>;
  onNavigateToDiary?: () => void;
}

export function MealSuggestionsTab({
  initialCategory,
  profile,
  goal,
  metabolicPrefs,
  onLogDish,
  onNavigateToDiary,
}: MealSuggestionsTabProps) {
  // Detect current time category by default if not explicitly provided
  const detectedCategory = useMemo(() => getCurrentMealTimeCategory(), []);
  const [selectedCategory, setSelectedCategory] = useState<MealTimeCategory>(
    initialCategory || detectedCategory,
  );

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOption, setFilterOption] = useState<DishFilterOption>("all");
  const [sortOption, setSortOption] = useState<DishSortOption>("suitability");

  // Detail Modal state
  const [selectedDish, setSelectedDish] = useState<SuggestedDish | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [logSuccessMessage, setLogSuccessMessage] = useState<string | null>(null);

  // Update selected category if initialCategory changes from parent
  React.useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  // Filtered and sorted list
  const displayedDishes = useMemo(() => {
    return filterAndSortDishes({
      dishes: SUGGESTED_DISHES,
      category: selectedCategory,
      filterOption,
      sortOption,
      profile,
      goal,
      metabolicPrefs,
      searchQuery,
    });
  }, [selectedCategory, filterOption, sortOption, profile, goal, metabolicPrefs, searchQuery]);

  const activeCategoryInfo = MEAL_CATEGORY_INFO[selectedCategory];

  const handleQuickLog = async (dish: SuggestedDish) => {
    try {
      setIsLogging(true);
      await onLogDish(dish, { customizeFirst: false });
      setLogSuccessMessage(`Đã thêm "${dish.name}" vào nhật ký bữa ăn!`);
      setTimeout(() => {
        setLogSuccessMessage(null);
        if (selectedDish) setSelectedDish(null);
      }, 1600);
    } catch (err) {
      console.error("Error logging suggested dish:", err);
    } finally {
      setIsLogging(false);
    }
  };

  const handleCustomizeLog = (dish: SuggestedDish) => {
    if (selectedDish) setSelectedDish(null);
    onLogDish(dish, { customizeFirst: true });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner: Time of Day context */}
      <div className="rounded-3xl border border-stone-200 bg-gradient-to-br from-emerald-500/10 via-white to-lime-500/10 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Gợi ý món ăn theo thời điểm
              </span>
              {selectedCategory === detectedCategory && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                  <Clock className="h-3 w-3 text-amber-600 animate-pulse" />
                  Đang trong khung giờ hiện tại
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Thời điểm này nên ăn món gì?
            </h1>
            <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
              Các gợi ý được thiết kế khoa học dựa trên thâm hụt calo, bảo toàn khối cơ bắp, hỗ trợ
              kiểm soát mỡ gan (MASLD) và ổn định đường huyết, không có đường bổ sung.
            </p>
          </div>

          {/* Quick Coach Insight Box */}
          <div className="rounded-2xl border border-emerald-200/80 bg-white/80 p-4 shadow-sm max-w-sm backdrop-blur-sm">
            <div className="flex items-start gap-2.5">
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 shrink-0">
                <ChefHat className="h-5 w-5" />
              </div>
              <div className="text-xs space-y-1">
                <span className="font-bold text-stone-900 block">Lời khuyên cho {activeCategoryInfo.label}:</span>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  {activeCategoryInfo.guideline}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {logSuccessMessage && (
        <div className="rounded-2xl bg-emerald-600 text-white p-4 shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-sm font-bold">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{logSuccessMessage}</span>
          </div>
          {onNavigateToDiary && (
            <button
              onClick={onNavigateToDiary}
              className="rounded-xl bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-semibold transition"
            >
              Xem nhật ký →
            </button>
          )}
        </div>
      )}

      {/* 5 Meal Time Categories Selector (Option B) */}
      <div className="rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {(["breakfast", "lunch", "afternoon", "dinner", "snack"] as const).map((cat) => {
            const info = MEAL_CATEGORY_INFO[cat];
            const isActive = selectedCategory === cat;
            const isNow = detectedCategory === cat;
            const count = SUGGESTED_DISHES.filter((d) => d.category === cat).length;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`relative flex flex-col items-center justify-center rounded-xl p-3 text-center transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-bold"
                    : "bg-stone-50/70 text-stone-700 hover:bg-stone-100 font-medium"
                }`}
              >
                {isNow && (
                  <span
                    className={`absolute -top-1.5 -right-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                      isActive ? "bg-amber-400 text-stone-900" : "bg-emerald-600 text-white"
                    }`}
                  >
                    Bây giờ
                  </span>
                )}
                <span className="text-sm font-bold">{info.label}</span>
                <span
                  className={`text-[10px] mt-0.5 ${
                    isActive ? "text-emerald-100" : "text-stone-400"
                  }`}
                >
                  {info.timeRange}
                </span>
                <span
                  className={`text-[10px] mt-1 px-1.5 py-0.2 rounded-md font-semibold ${
                    isActive ? "bg-white/20 text-white" : "bg-stone-200/60 text-stone-600"
                  }`}
                >
                  {count} món
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters & Sorting Bar (Section 6) */}
      <div className="space-y-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Tìm món trong ${activeCategoryInfo.label.toLowerCase()} (ức gà, trứng, bún, cá hồi...)...`}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-8 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-xs font-semibold text-stone-500 flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5 text-stone-400" />
              Sắp xếp:
            </span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as DishSortOption)}
              className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="suitability">Phù hợp nhất với mục tiêu của tôi</option>
              <option value="highest_protein">Giàu đạm nhất (Protein cao)</option>
              <option value="lowest_calories">Calo thấp nhất</option>
              <option value="fastest_prep">Chuẩn bị nhanh nhất</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100">
          <span className="text-[11px] font-semibold text-stone-500 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3 text-stone-400" />
            Lọc theo:
          </span>
          {[
            { id: "all", label: "Tất cả" },
            { id: "high_protein", label: "🥩 Giàu đạm (≥20g)" },
            { id: "low_sugar", label: "🍃 0g đường thêm" },
            { id: "high_fiber", label: "🌾 Giàu chất xơ (≥4g)" },
            { id: "lower_carb", label: "🥗 Low Carb (≤30g)" },
            { id: "quick_prep", label: "⚡ Nhanh gọn (≤10 phút)" },
            { id: "vietnamese", label: "🇻🇳 Món Việt" },
            { id: "vegetarian", label: "🌱 Món chay" },
            { id: "budget", label: "💰 Tiết kiệm" },
          ].map((pill) => {
            const isSelected = filterOption === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setFilterOption(pill.id as DishFilterOption)}
                className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900"
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Suggested Dishes Grid */}
      {displayedDishes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center space-y-3">
          <Utensils className="h-10 w-10 text-stone-300 mx-auto" />
          <h3 className="text-base font-bold text-stone-700">
            Không tìm thấy món ăn phù hợp với bộ lọc hiện tại
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Hãy thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc &quot;Tất cả&quot; để khám phá toàn bộ thực đơn gợi ý.
          </p>
          <button
            onClick={() => {
              setFilterOption("all");
              setSearchQuery("");
            }}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
          >
            Hiển thị lại tất cả
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedDishes.map((dish) => {
            const suitability = getPersonalizedDishScore(dish, profile, goal, metabolicPrefs);

            return (
              <div
                key={dish.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-stone-200/90 bg-white p-5 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-2xl shadow-inner group-hover:scale-105 transition-transform">
                        {dish.emoji}
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-900 text-sm leading-tight group-hover:text-emerald-700 transition-colors">
                          {dish.name}
                        </h3>
                        {dish.nameEn && (
                          <p className="text-[11px] text-stone-400 italic line-clamp-1">
                            {dish.nameEn}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Personalization Tag & Match Reasons */}
                  <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/60 p-2 text-[11px] text-emerald-900 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1 text-emerald-800">
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        {suitability.recommendationBadge}
                      </span>
                      <span className="text-[10px] text-emerald-700 bg-white px-1.5 py-0.2 rounded font-mono font-bold">
                        {suitability.score}% Match
                      </span>
                    </div>
                    {suitability.matchReasons.length > 0 && (
                      <p className="text-[10px] text-emerald-800 leading-snug">
                        {suitability.matchReasons[0]}
                      </p>
                    )}
                  </div>

                  {/* Short Description */}
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {dish.description}
                  </p>

                  {/* Macros Summary Box */}
                  <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-stone-50 p-2.5 text-center text-[10px]">
                    <div>
                      <span className="text-stone-400 block font-medium">Năng lượng</span>
                      <strong className="text-xs font-bold text-stone-900">
                        {dish.calories} <span className="text-[9px] font-normal">kcal</span>
                      </strong>
                    </div>
                    <div>
                      <span className="text-emerald-600 block font-medium">Đạm (P)</span>
                      <strong className="text-xs font-bold text-emerald-700">
                        {dish.protein}g
                      </strong>
                    </div>
                    <div>
                      <span className="text-amber-600 block font-medium">Carb</span>
                      <strong className="text-xs font-bold text-amber-700">
                        {dish.carbohydrates}g
                      </strong>
                    </div>
                    <div>
                      <span className="text-rose-500 block font-medium">Chất béo</span>
                      <strong className="text-xs font-bold text-rose-700">{dish.fat}g</strong>
                    </div>
                  </div>

                  {/* Dietary Tag badges */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                      <Clock className="h-2.5 w-2.5" />
                      {dish.prepTime}
                    </span>
                    <span className="inline-flex items-center text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                      {dish.difficulty}
                    </span>
                    {dish.dietaryTags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 border-t border-stone-100 mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDish(dish)}
                    className="flex-1 rounded-xl border border-stone-200 bg-white py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-emerald-500 transition text-center"
                  >
                    Xem chi tiết & Nấu
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLog(dish)}
                    disabled={isLogging}
                    className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 active:scale-95 transition flex items-center gap-1 shrink-0"
                    title="Ghi nhận ngay món này vào bữa ăn hôm nay"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Ăn món này</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal: Full Recipe & Clinical Suitability View */}
      {selectedDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl my-8 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-2xl shadow-inner">
                  {selectedDish.emoji}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">{selectedDish.name}</h2>
                  {selectedDish.nameEn && (
                    <p className="text-xs text-stone-500 italic">{selectedDish.nameEn}</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDish(null)}
                className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-5">
              {/* Nutritional Overview Bar */}
              <div className="rounded-2xl bg-stone-900 text-white p-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                  <span className="text-xs font-semibold text-stone-400">Năng lượng 1 khẩu phần:</span>
                  <span className="text-xl font-bold text-lime-400">
                    {selectedDish.calories} kcal
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-3 text-center text-xs">
                  <div>
                    <span className="text-stone-400 text-[10px]">Đạm (Protein)</span>
                    <p className="font-bold text-emerald-400 text-sm">{selectedDish.protein}g</p>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px]">Tinh bột (Carb)</span>
                    <p className="font-bold text-amber-400 text-sm">
                      {selectedDish.carbohydrates}g
                    </p>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px]">Chất béo (Fat)</span>
                    <p className="font-bold text-rose-400 text-sm">{selectedDish.fat}g</p>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px]">Chất xơ (Fiber)</span>
                    <p className="font-bold text-teal-400 text-sm">{selectedDish.fiber}g</p>
                  </div>
                </div>
              </div>

              {/* Scientific Suitability Rationale */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Tại sao món này phù hợp với bạn?</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {selectedDish.suitabilityNotes}
                </p>
              </div>

              {/* Ingredients Checklist */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Utensils className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Nguyên liệu & Khẩu phần định lượng:</span>
                </h3>
                <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 divide-y divide-stone-200/60">
                  {selectedDish.ingredients.map((ing, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5 text-xs text-stone-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="font-semibold">{ing.name}</span>
                        {ing.notes && (
                          <span className="text-[11px] text-stone-500 italic">
                            ({ing.notes})
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-stone-900 bg-white px-2 py-0.5 rounded-md border border-stone-200 text-[11px]">
                        {ing.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ChefHat className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Các bước chế biến ({selectedDish.prepTime}):</span>
                </h3>
                <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
                  {selectedDish.instructions.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs leading-relaxed">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-stone-700">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedDish.tips && (
                <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Mẹo nhỏ:</strong> {selectedDish.tips}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedDish(null)}
                className="w-full sm:w-auto rounded-xl px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
              >
                Đóng lại
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleCustomizeLog(selectedDish)}
                  className="flex-1 sm:flex-none rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-emerald-500 transition"
                >
                  Tùy chỉnh định lượng...
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLog(selectedDish)}
                  disabled={isLogging}
                  className="flex-1 sm:flex-none rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 active:scale-95 transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isLogging ? "Đang ghi nhận..." : "Ghi nhận ngay vào bữa ăn"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

