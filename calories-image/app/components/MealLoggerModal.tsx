"use client";

import React, { useState, useRef } from "react";
import {
  Camera,
  Upload,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  Check,
  Search,
  RefreshCw,
  Info,
} from "lucide-react";
import { SEED_FOODS, searchFoods, type FoodItem } from "@/lib/data/seedFoods";
import { scaleNutritionValues, round, type NutritionValues } from "@/lib/nutrition";
import type { StoredMeal } from "@/lib/db/repository";

interface MealLoggerModalProps {
  isOpen: boolean;
  initialMode: "photo" | "manual";
  onClose: () => void;
  onSaveMeal: (mealData: {
    mealType: "breakfast" | "lunch" | "dinner" | "snack";
    eatenAt: string;
    notes?: string;
    analysisStatus: "manual" | "ai_pending" | "ai_confirmed" | "rejected";
    items: Array<{
      foodId?: string;
      foodName: string;
      portionG: number;
      nutrition: NutritionValues;
      isAiEstimated?: boolean;
      confidence?: number;
      nutritionSource?: string;
    }>;
  }) => Promise<void>;
}

type EditableItem = {
  id: string;
  foodId?: string;
  foodName: string;
  portionG: number;
  nutrition: NutritionValues;
  isAiEstimated: boolean;
  confidence?: number;
  notes?: string;
  uncertainties?: string[];
};

export function MealLoggerModal({
  isOpen,
  initialMode,
  onClose,
  onSaveMeal,
}: MealLoggerModalProps) {
  const [mode, setMode] = useState<"photo" | "manual">(initialMode);
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [notes, setNotes] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [aiObservations, setAiObservations] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  // Editable candidate items
  const [items, setItems] = useState<EditableItem[]>([]);

  // Manual Food Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Image Upload / Take Photo with client-side optimization
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setAnalysisError("Kích thước tệp vượt quá 15MB. Vui lòng chọn ảnh nhỏ hơn.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          // Resize to max 1280px to optimize upload speed and AI vision latency
          const maxDim = 1280;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedBase64 = canvas.toDataURL("image/jpeg", 0.85);
            setSelectedImage(optimizedBase64);
            setSelectedImageFile(null); // Direct use of optimized data URL
          } else {
            setSelectedImage(reader.result as string);
            setSelectedImageFile(file);
          }
          setAnalysisError(null);
        };
        img.onerror = () => {
          setSelectedImage(reader.result as string);
          setSelectedImageFile(file);
          setAnalysisError(null);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Run AI Vision Analysis Endpoint
  const handleAnalyzePhoto = async () => {
    if (!selectedImageFile && !selectedImage) {
      setAnalysisError("Vui lòng chụp hoặc tải ảnh bữa ăn trước.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      let res: Response;

      if (selectedImageFile) {
        const formData = new FormData();
        formData.append("image", selectedImageFile);
        if (notes) formData.append("note", notes);

        res = await fetch("/api/ai/analyze-meal", {
          method: "POST",
          body: formData,
        });
      } else {
        const base64Data = selectedImage!.split(",")[1];
        res = await fetch("/api/ai/analyze-meal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: "image/jpeg",
            note: notes,
          }),
        });
      }

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Không thể phân tích ảnh bữa ăn.");
      }

      const data = json.data;
      if (json.meta?.provider) {
        setActiveProvider(json.meta.provider);
      }
      if (data.mealTypeInferred) {
        setMealType(data.mealTypeInferred);
      }
      if (data.observations) {
        setAiObservations(data.observations);
      }

      // Populate candidate items for user review & editing
      const detected: EditableItem[] = (data.candidates || []).map((c: any, idx: number) => ({
        id: `ai-${Date.now()}-${idx}`,
        foodId: c.standardizedName,
        foodName: c.name,
        portionG: c.portionG,
        nutrition: {
          calories: c.calories,
          protein: c.protein,
          carbs: c.carbs,
          fat: c.fat,
          fiber: c.fiber,
        },
        isAiEstimated: true,
        confidence: c.confidence,
        notes: c.notes,
        uncertainties: c.uncertainties,
      }));

      setItems(detected);
    } catch (err: any) {
      setAnalysisError(err.message || "Đã xảy ra sự cố khi gọi API AI.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Update item portion and recalculate macros proportionally
  const handlePortionChange = (itemId: string, newGrams: number) => {
    if (newGrams <= 0) return;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          const ratio = newGrams / it.portionG;
          return {
            ...it,
            portionG: newGrams,
            nutrition: {
              calories: round(it.nutrition.calories * ratio, 1),
              protein: round(it.nutrition.protein * ratio, 1),
              carbs: round(it.nutrition.carbs * ratio, 1),
              fat: round(it.nutrition.fat * ratio, 1),
              fiber: round(it.nutrition.fiber * ratio, 1),
            },
          };
        }
        return it;
      }),
    );
  };

  // Update item name
  const handleNameChange = (itemId: string, newName: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, foodName: newName } : it)),
    );
  };

  // Remove an item
  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Add food from manual catalog search
  const handleAddCatalogFood = (food: FoodItem) => {
    const newItem: EditableItem = {
      id: `manual-${Date.now()}`,
      foodId: food.id,
      foodName: food.name,
      portionG: food.defaultPortionG,
      nutrition: scaleNutritionValues({
        values: {
          calories: food.caloriesPer100g,
          protein: food.proteinPer100g,
          carbs: food.carbsPer100g,
          fat: food.fatPer100g,
          fiber: food.fiberPer100g,
        },
        portionG: food.defaultPortionG,
        referenceG: 100,
      }),
      isAiEstimated: false,
    };

    setItems((prev) => [...prev, newItem]);
    setIsSearching(false);
    setSearchQuery("");
  };

  // Calculate totals
  const totalCals = items.reduce((sum, it) => sum + it.nutrition.calories, 0);
  const totalProtein = items.reduce((sum, it) => sum + it.nutrition.protein, 0);
  const totalCarbs = items.reduce((sum, it) => sum + it.nutrition.carbs, 0);
  const totalFat = items.reduce((sum, it) => sum + it.nutrition.fat, 0);
  const totalFiber = items.reduce((sum, it) => sum + it.nutrition.fiber, 0);

  // Submit and Save Meal
  const handleConfirmSave = async () => {
    if (items.length === 0) {
      setAnalysisError("Vui lòng thêm ít nhất một món ăn trước khi lưu.");
      return;
    }

    const hasAi = items.some((it) => it.isAiEstimated);

    await onSaveMeal({
      mealType,
      eatenAt: new Date().toISOString(),
      notes,
      analysisStatus: hasAi ? "ai_confirmed" : "manual",
      items: items.map((it) => ({
        foodId: it.foodId,
        foodName: it.foodName,
        portionG: it.portionG,
        nutrition: it.nutrition,
        isAiEstimated: it.isAiEstimated,
        confidence: it.confidence,
        nutritionSource: it.isAiEstimated ? "AI Vision" : "Danh mục Viện Dinh Dưỡng",
      })),
    });

    onClose();
  };

  const filteredFoods = searchFoods(searchQuery);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Ghi nhận bữa ăn</h2>
            <p className="text-xs text-stone-500">
              {mode === "photo" ? "Chụp ảnh bằng AI hoặc chỉnh sửa" : "Nhập món từ danh mục dinh dưỡng"}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-stone-100 p-1">
            <button
              onClick={() => setMode("photo")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                mode === "photo" ? "bg-white text-emerald-700 shadow-sm" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Chụp ảnh AI</span>
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                mode === "manual" ? "bg-white text-emerald-700 shadow-sm" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nhập thủ công</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* Meal Type & Time */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-stone-600">Loại bữa:</span>
            {(["breakfast", "lunch", "dinner", "snack"] as const).map((type) => {
              const labels: Record<string, string> = {
                breakfast: "Bữa sáng",
                lunch: "Bữa trưa",
                dinner: "Bữa tối",
                snack: "Bữa phụ",
              };
              return (
                <button
                  key={type}
                  onClick={() => setMealType(type)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    mealType === type
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {labels[type]}
                </button>
              );
            })}
          </div>

          {/* Photo Mode Section */}
          {mode === "photo" && (
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-dashed border-stone-300 p-4 text-center hover:border-emerald-500 transition">
                {selectedImage ? (
                  <div className="space-y-3">
                    <img
                      src={selectedImage}
                      alt="Ảnh bữa ăn"
                      className="mx-auto max-h-52 rounded-xl object-cover shadow"
                    />
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                      >
                        Chọn ảnh khác
                      </button>
                      <button
                        onClick={handleAnalyzePhoto}
                        disabled={isAnalyzing}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isAnalyzing ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>AI đang phân tích...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Phân tích bằng AI</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer py-6 space-y-2"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <Camera className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-stone-800">
                      Nhấn vào đây để Chụp ảnh hoặc Tải ảnh lên
                    </p>
                    <p className="text-xs text-stone-500">
                      Hỗ trợ JPEG, PNG, WebP (Tối đa 5MB). AI tự động nhận diện khẩu phần.
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              {analysisError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{analysisError}</span>
                </div>
              )}

              {aiObservations && (
                <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
                  <Sparkles className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <p>{aiObservations}</p>
                </div>
              )}
            </div>
          )}

          {/* Items Review & Editing Table */}
          <div className="space-y-3">
            {activeProvider === "mock" && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">Đang hiển thị thực đơn mẫu (Chế độ Mock):</span>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Ứng dụng chưa nhận diện được ảnh thật vì chưa nhận được khóa <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono font-semibold">AI_PROVIDER_API_KEY</code> trên Vercel. Hãy thêm biến <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono font-semibold">AI_PROVIDER_API_KEY</code> trong mục Environment Variables của Vercel và bấm <strong>Redeploy</strong> để kích hoạt Google Gemini Vision!
                  </p>
                </div>
              </div>
            )}

            {activeProvider === "gemini" && (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 border border-emerald-200">
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Đã phân tích thành công bằng Google Gemini Vision!</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">
                Thành phần bữa ăn ({items.length} món)
              </h3>
              <button
                onClick={() => setIsSearching(!isSearching)}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm món khác</span>
              </button>
            </div>

            {/* Manual Search Dropdown */}
            {isSearching && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm món Việt (Phở, ức gà, cơm, rau muống...)"
                    className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-emerald-500 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-stone-200/60 rounded-xl bg-white border border-stone-200">
                  {filteredFoods.slice(0, 8).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleAddCatalogFood(f)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-emerald-50 transition"
                    >
                      <div>
                        <span className="font-semibold text-stone-900">{f.name}</span>
                        <span className="ml-2 text-[10px] text-stone-500">
                          {f.caloriesPer100g} kcal / 100g
                        </span>
                      </div>
                      <span className="font-semibold text-emerald-600">
                        +{f.defaultPortionG}g
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <p className="text-xs text-stone-400 italic text-center py-4">
                Chưa có món ăn nào. Hãy chụp ảnh hoặc bấm &apos;Thêm món khác&apos;.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm hover:border-emerald-300 transition"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={it.foodName}
                          onChange={(e) => handleNameChange(it.id, e.target.value)}
                          className="font-semibold text-sm text-stone-900 border-b border-transparent hover:border-stone-300 focus:border-emerald-500 focus:outline-none bg-transparent"
                        />
                        {it.isAiEstimated && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            AI {(it.confidence ? Math.round(it.confidence * 100) : 90)}%
                          </span>
                        )}
                      </div>
                      {it.uncertainties && it.uncertainties.length > 0 && (
                        <p className="text-[10px] text-amber-700 flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          <span>Lưu ý: {it.uncertainties.join(", ")}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={it.portionG}
                          onChange={(e) => handlePortionChange(it.id, Number(e.target.value))}
                          className="w-16 rounded-lg border border-stone-200 px-2 py-1 text-xs text-center font-bold text-stone-800 focus:border-emerald-500 focus:outline-none"
                          min="5"
                          step="5"
                        />
                        <span className="text-xs text-stone-500">g</span>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <span className="text-xs font-bold text-stone-900">{round(it.nutrition.calories, 0)} kcal</span>
                        <p className="text-[10px] text-emerald-600">{round(it.nutrition.protein, 1)}g P</p>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(it.id)}
                        className="rounded-lg p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meal Notes */}
          <div>
            <label className="text-xs font-semibold text-stone-600">Ghi chú bữa ăn (tùy chọn):</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Cơm trưa tại căng tin công ty, không uống nước ngọt..."
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Macro Totals Preview */}
          {items.length > 0 && (
            <div className="rounded-2xl bg-stone-900 text-white p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-300">Tổng năng lượng bữa ăn:</span>
                <span className="text-xl font-bold text-lime-400">{round(totalCals, 0)} kcal</span>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-stone-800 text-center text-xs">
                <div>
                  <span className="text-stone-400 text-[10px]">Đạm (Protein)</span>
                  <p className="font-bold text-emerald-400">{round(totalProtein, 1)}g</p>
                </div>
                <div>
                  <span className="text-stone-400 text-[10px]">Tinh bột (Carb)</span>
                  <p className="font-bold text-amber-400">{round(totalCarbs, 1)}g</p>
                </div>
                <div>
                  <span className="text-stone-400 text-[10px]">Chất béo (Fat)</span>
                  <p className="font-bold text-rose-400">{round(totalFat, 1)}g</p>
                </div>
                <div>
                  <span className="text-stone-400 text-[10px]">Chất xơ (Fiber)</span>
                  <p className="font-bold text-teal-400">{round(totalFiber, 1)}g</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleConfirmSave}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            <Check className="h-4 w-4" />
            <span>Xác nhận & Lưu bữa ăn</span>
          </button>
        </div>
      </div>
    </div>
  );
}

