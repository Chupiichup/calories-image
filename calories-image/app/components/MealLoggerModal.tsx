"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  Camera,
  Image as ImageIcon,
  Upload,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  Check,
  Search,
  RefreshCw,
  Info,
  Calendar,
  Clock,
  HeartPulse,
  Flame,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { SEED_FOODS, searchFoods, type FoodItem } from "@/lib/data/seedFoods";
import { SUGGESTED_DISHES } from "@/lib/data/mealSuggestionsData";
import { scaleNutritionValues, round, type NutritionValues } from "@/lib/nutrition";
import {
  formatToVietnamDateTimeLocal,
  vietnamDateTimeLocalToIso,
  getLocalDateString,
  repository,
  type StoredMeal,
} from "@/lib/db/repository";
import {
  type SugarClassification,
  type GiCategory,
  type GlCategory,
  type MetabolicPreferences,
  DEFAULT_METABOLIC_PREFERENCES,
  resolveItemMetabolicDetails,
  evaluateMealMetabolic,
} from "@/lib/metabolic";

interface MealLoggerModalProps {
  isOpen: boolean;
  initialMode: "photo" | "manual";
  prefilledMealType?: "breakfast" | "lunch" | "dinner" | "snack";
  prefilledItems?: Array<{
    foodName: string;
    portionG: number;
    nutrition: NutritionValues;
    addedSugarG?: number;
    totalSugarG?: number;
    giValue?: number;
  }>;
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
      sugarClassification?: SugarClassification;
      addedSugarG?: number;
      totalSugarG?: number;
      giValue?: number;
      giCategory?: GiCategory;
      glValue?: number;
      glCategory?: GlCategory;
      metabolicNotes?: string;
    }>;
  }) => Promise<void>;
}

type EditableItem = {
  id: string;
  foodId?: string;
  foodName: string;
  portionG: number | "";
  baseNutritionPer100g: NutritionValues;
  nutrition: NutritionValues;
  isAiEstimated: boolean;
  confidence?: number;
  notes?: string;
  uncertainties?: string[];
  sugarClassification?: SugarClassification;
  addedSugarG?: number;
  totalSugarG?: number;
  giValue?: number;
  giCategory?: GiCategory;
  glValue?: number;
  glCategory?: GlCategory;
  clarificationQuestion?: string;
  suggestedAlternative?: string;
};

export function MealLoggerModal({
  isOpen,
  initialMode,
  prefilledMealType,
  prefilledItems,
  onClose,
  onSaveMeal,
}: MealLoggerModalProps) {
  const [mode, setMode] = useState<"photo" | "manual">(initialMode);
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">(
    prefilledMealType || "lunch",
  );
  const [eatenAtLocal, setEatenAtLocal] = useState<string>(() => formatToVietnamDateTimeLocal(new Date()));
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
  const [isSearching, setIsSearching] = useState(initialMode === "manual");
  const [editingNutritionItemId, setEditingNutritionItemId] = useState<string | null>(null);

  // Metabolic tracking context
  const [metabolicPrefs, setMetabolicPrefs] = useState<MetabolicPreferences>(DEFAULT_METABOLIC_PREFERENCES);
  const [priorDailyAddedSugarG, setPriorDailyAddedSugarG] = useState(0);
  const [previousMealEatenAt, setPreviousMealEatenAt] = useState<string | undefined>(undefined);
  const [todaySnackCount, setTodaySnackCount] = useState(0);

  React.useEffect(() => {
    if (isOpen) {
      if (prefilledMealType) {
        setMealType(prefilledMealType);
      }
      if (prefilledItems && prefilledItems.length > 0) {
        const loaded: EditableItem[] = prefilledItems.map((pi, idx) => {
          const portion = pi.portionG > 0 ? pi.portionG : 100;
          return {
            id: `prefilled-${Date.now()}-${idx}`,
            foodName: pi.foodName,
            portionG: portion,
            baseNutritionPer100g: {
              calories: (pi.nutrition.calories / portion) * 100,
              protein: (pi.nutrition.protein / portion) * 100,
              carbs: (pi.nutrition.carbs / portion) * 100,
              fat: (pi.nutrition.fat / portion) * 100,
              fiber: (pi.nutrition.fiber / portion) * 100,
            },
            nutrition: pi.nutrition,
            isAiEstimated: false,
            addedSugarG: pi.addedSugarG ?? 0,
            totalSugarG: pi.totalSugarG ?? 0,
            sugarClassification: (pi.addedSugarG ?? 0) > 0 ? "ADDED_SUGAR" : "NO_KNOWN_SUGAR",
            giValue: pi.giValue,
          };
        });
        setItems(loaded);
      }
      if (initialMode === "manual") {
        setIsSearching(true);
      }
      repository.getMetabolicPreferences().then((p) => {
        if (p) setMetabolicPrefs(p);
      });
      repository.getAllMeals().then((allMeals) => {
        const todayStr = getLocalDateString(vietnamDateTimeLocalToIso(eatenAtLocal));
        const todayMeals = allMeals.filter((m) => getLocalDateString(m.eatenAt) === todayStr);

        let sugarAcc = 0;
        let snacks = 0;
        todayMeals.forEach((m) => {
          if (m.mealType === "snack") snacks++;
          (m.items || []).forEach((it) => {
            sugarAcc += (it.addedSugarG || 0);
          });
        });
        setPriorDailyAddedSugarG(round(sugarAcc, 1));
        setTodaySnackCount(snacks);

        if (todayMeals.length > 0) {
          const sorted = [...todayMeals].sort(
            (a, b) => new Date(b.eatenAt).getTime() - new Date(a.eatenAt).getTime(),
          );
          setPreviousMealEatenAt(sorted[0].eatenAt);
        }
      });
    }
  }, [isOpen, eatenAtLocal]);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Handle Image Upload / Take Photo with client-side optimization
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Default eatenAt to the photo file's last modified timestamp if available, else current VN time
      if (file.lastModified && file.lastModified > 946684800000 && file.lastModified <= Date.now() + 60000) {
        setEatenAtLocal(formatToVietnamDateTimeLocal(new Date(file.lastModified)));
      } else {
        setEatenAtLocal(formatToVietnamDateTimeLocal(new Date()));
      }

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
    let base64Data = "";
    if (selectedImage) {
      base64Data = selectedImage.includes(",") ? selectedImage.split(",")[1] : selectedImage;
    }

    if (!selectedImageFile && !base64Data) {
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
      const detected: EditableItem[] = (data.candidates || []).map((c: any, idx: number) => {
        const portionG = c.portionG || 100;
        const baseNutrition = {
          calories: (c.calories / portionG) * 100,
          protein: (c.protein / portionG) * 100,
          carbs: (c.carbs / portionG) * 100,
          fat: (c.fat / portionG) * 100,
          fiber: (c.fiber / portionG) * 100,
        };
        const metabolic = resolveItemMetabolicDetails({
          foodName: c.name,
          portionG,
          carbsG: c.carbs,
          aiSugarClassification: c.sugarClassification,
          aiEstimatedAddedSugarG: c.estimatedAddedSugarG,
          aiEstimatedTotalSugarG: c.estimatedTotalSugarG,
          aiGiEstimate: c.giEstimate,
          aiGiCategory: c.giCategory,
        });

        return {
          id: `ai-${Date.now()}-${idx}`,
          foodId: c.standardizedName,
          foodName: c.name,
          portionG,
          baseNutritionPer100g: baseNutrition,
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
          sugarClassification: metabolic.sugarClassification,
          addedSugarG: metabolic.addedSugarG,
          totalSugarG: metabolic.totalSugarG,
          giValue: metabolic.giValue,
          giCategory: metabolic.giCategory,
          glValue: metabolic.glValue,
          glCategory: metabolic.glCategory,
          clarificationQuestion: metabolic.clarificationQuestion,
          suggestedAlternative: metabolic.suggestedAlternative,
        };
      });

      setItems(detected);
    } catch (err: any) {
      setAnalysisError(err.message || "Đã xảy ra sự cố khi gọi API AI.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Update item portion and recalculate macros proportionally
  const handlePortionChange = (itemId: string, rawVal: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          if (rawVal === "") {
            return {
              ...it,
              portionG: "",
              nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
              addedSugarG: 0,
              totalSugarG: 0,
              glValue: 0,
            };
          }
          const num = Number(rawVal);
          if (isNaN(num)) return it;
          const portionG = Math.max(0, num);
          const ratio = portionG / 100;
          const scaledCarbs = round(it.baseNutritionPer100g.carbs * ratio, 1);
          const metabolic = resolveItemMetabolicDetails({
            foodName: it.foodName,
            portionG,
            carbsG: scaledCarbs,
            aiSugarClassification: it.sugarClassification,
            aiEstimatedAddedSugarG:
              typeof it.addedSugarG === "number" && typeof it.portionG === "number" && it.portionG > 0
                ? round((it.addedSugarG / it.portionG) * portionG, 1)
                : undefined,
            aiEstimatedTotalSugarG:
              typeof it.totalSugarG === "number" && typeof it.portionG === "number" && it.portionG > 0
                ? round((it.totalSugarG / it.portionG) * portionG, 1)
                : undefined,
            aiGiEstimate: it.giValue,
            aiGiCategory: it.giCategory,
          });

          return {
            ...it,
            portionG,
            nutrition: {
              calories: round(it.baseNutritionPer100g.calories * ratio, 1),
              protein: round(it.baseNutritionPer100g.protein * ratio, 1),
              carbs: scaledCarbs,
              fat: round(it.baseNutritionPer100g.fat * ratio, 1),
              fiber: round(it.baseNutritionPer100g.fiber * ratio, 1),
            },
            sugarClassification: metabolic.sugarClassification,
            addedSugarG: metabolic.addedSugarG,
            totalSugarG: metabolic.totalSugarG,
            giValue: metabolic.giValue,
            giCategory: metabolic.giCategory,
            glValue: metabolic.glValue,
            glCategory: metabolic.glCategory,
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

  // Metabolic item level handlers
  const handleUpdateSugarClass = (itemId: string, newClass: SugarClassification) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        let newAddedSugar = it.addedSugarG;
        if (newClass === "NO_KNOWN_SUGAR") {
          newAddedSugar = 0;
        } else if (newClass === "ADDED_SUGAR" && (!newAddedSugar || newAddedSugar === 0)) {
          newAddedSugar = 10;
        }
        return {
          ...it,
          sugarClassification: newClass,
          addedSugarG: newAddedSugar,
        };
      }),
    );
  };

  const handleUpdateAddedSugar = (itemId: string, newG: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const clamped = Math.max(0, newG);
        return {
          ...it,
          addedSugarG: clamped,
          sugarClassification:
            clamped > 0
              ? it.sugarClassification === "NATURAL_SUGAR" || it.sugarClassification === "BOTH_NATURAL_AND_ADDED"
                ? "BOTH_NATURAL_AND_ADDED"
                : "ADDED_SUGAR"
              : it.sugarClassification === "BOTH_NATURAL_AND_ADDED"
              ? "NATURAL_SUGAR"
              : it.sugarClassification,
        };
      }),
    );
  };

  const handleQuickClarification = (itemId: string, sugarClass: SugarClassification, addedG: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        return {
          ...it,
          sugarClassification: sugarClass,
          addedSugarG: addedG,
          clarificationQuestion: undefined,
        };
      }),
    );
  };

  // Add food from manual catalog search
  const handleAddCatalogFood = (food: FoodItem) => {
    const defaultG = food.defaultPortionG || 100;
    const baseNutrition: NutritionValues = {
      calories: food.caloriesPer100g,
      protein: food.proteinPer100g,
      carbs: food.carbsPer100g,
      fat: food.fatPer100g,
      fiber: food.fiberPer100g,
    };
    const scaledNutrition = scaleNutritionValues({
      values: baseNutrition,
      portionG: defaultG,
      referenceG: 100,
    });
    const metabolic = resolveItemMetabolicDetails({
      foodName: food.name,
      portionG: defaultG,
      carbsG: scaledNutrition.carbs,
    });

    const newItem: EditableItem = {
      id: `manual-${Date.now()}`,
      foodId: food.id,
      foodName: food.name,
      portionG: defaultG,
      baseNutritionPer100g: baseNutrition,
      nutrition: scaledNutrition,
      isAiEstimated: false,
      sugarClassification: metabolic.sugarClassification,
      addedSugarG: metabolic.addedSugarG,
      totalSugarG: metabolic.totalSugarG,
      giValue: metabolic.giValue,
      giCategory: metabolic.giCategory,
      glValue: metabolic.glValue,
      glCategory: metabolic.glCategory,
      clarificationQuestion: metabolic.clarificationQuestion,
      suggestedAlternative: metabolic.suggestedAlternative,
    };

    setItems((prev) => [...prev, newItem]);
    setIsSearching(false);
    setSearchQuery("");
  };

  // Add quick custom food when not found in catalog or by user preference
  const handleAddCustomFood = (customName: string) => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    const defaultG = 100;
    const baseNutrition: NutritionValues = {
      calories: 100,
      protein: 5,
      carbs: 10,
      fat: 3,
      fiber: 1,
    };
    const metabolic = resolveItemMetabolicDetails({
      foodName: trimmed,
      portionG: defaultG,
      carbsG: baseNutrition.carbs,
    });

    const newItem: EditableItem = {
      id: `custom-${Date.now()}`,
      foodName: trimmed,
      portionG: defaultG,
      baseNutritionPer100g: baseNutrition,
      nutrition: { ...baseNutrition },
      isAiEstimated: false,
      sugarClassification: metabolic.sugarClassification,
      addedSugarG: metabolic.addedSugarG,
      totalSugarG: metabolic.totalSugarG,
      giValue: metabolic.giValue,
      giCategory: metabolic.giCategory,
      glValue: metabolic.glValue,
      glCategory: metabolic.glCategory,
      notes: "Món người dùng tự thêm tùy chỉnh",
    };

    setItems((prev) => [...prev, newItem]);
    setIsSearching(false);
    setSearchQuery("");
  };

  // Direct editing of calories, protein, carbs, fat for fine-tuning
  const handleDirectNutritionChange = (
    itemId: string,
    field: "calories" | "protein" | "carbs" | "fat",
    val: number,
  ) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const clamped = Math.max(0, val);
        const updatedNutrition = {
          ...it.nutrition,
          [field]: clamped,
        };
        const portion = typeof it.portionG === "number" && it.portionG > 0 ? it.portionG : 100;
        const ratio = 100 / portion;
        const updatedBase = {
          ...it.baseNutritionPer100g,
          [field]: round(clamped * ratio, 1),
        };
        return {
          ...it,
          nutrition: updatedNutrition,
          baseNutritionPer100g: updatedBase,
        };
      }),
    );
  };

  // Calculate totals
  const totalCals = items.reduce((sum, it) => sum + (it.nutrition?.calories || 0), 0);
  const totalProtein = items.reduce((sum, it) => sum + (it.nutrition?.protein || 0), 0);
  const totalCarbs = items.reduce((sum, it) => sum + (it.nutrition?.carbs || 0), 0);
  const totalFat = items.reduce((sum, it) => sum + (it.nutrition?.fat || 0), 0);
  const totalFiber = items.reduce((sum, it) => sum + (it.nutrition?.fiber || 0), 0);

  // Evaluate metabolic guardrails for this meal in real time
  const currentMealMetabolic = useMemo(() => {
    if (!metabolicPrefs.enabled) return null;
    return evaluateMealMetabolic({
      mealType,
      eatenAtIso: vietnamDateTimeLocalToIso(eatenAtLocal),
      items: items.map((it) => ({
        name: it.foodName,
        carbsG: it.nutrition.carbs,
        portionG: typeof it.portionG === "number" ? it.portionG : 100,
        sugarClassification: it.sugarClassification,
        addedSugarG: it.addedSugarG,
        totalSugarG: it.totalSugarG,
        giValue: it.giValue,
        giCategory: it.giCategory,
        glValue: it.glValue,
        glCategory: it.glCategory,
      })),
      priorDailyAddedSugarG,
      preferences: metabolicPrefs,
      previousMealEatenAtIso: previousMealEatenAt,
      todaySnackCount,
    });
  }, [items, mealType, eatenAtLocal, metabolicPrefs, priorDailyAddedSugarG, previousMealEatenAt, todaySnackCount]);

  // Submit and Save Meal
  const handleConfirmSave = async () => {
    let currentItems = [...items];

    // If no items have been added to the list yet, but user entered a search query,
    // automatically add the best match (or custom dish) before saving!
    if (currentItems.length === 0 && searchQuery.trim().length > 0) {
      if (filteredFoods.length > 0) {
        const food = filteredFoods[0];
        const defaultG = food.defaultPortionG || 100;
        const baseNutrition: NutritionValues = {
          calories: food.caloriesPer100g,
          protein: food.proteinPer100g,
          carbs: food.carbsPer100g,
          fat: food.fatPer100g,
          fiber: food.fiberPer100g,
        };
        const scaledNutrition = scaleNutritionValues({
          values: baseNutrition,
          portionG: defaultG,
          referenceG: 100,
        });
        const metabolic = resolveItemMetabolicDetails({
          foodName: food.name,
          portionG: defaultG,
          carbsG: scaledNutrition.carbs,
        });
        currentItems = [
          {
            id: `manual-${Date.now()}`,
            foodId: food.id,
            foodName: food.name,
            portionG: defaultG,
            baseNutritionPer100g: baseNutrition,
            nutrition: scaledNutrition,
            isAiEstimated: false,
            sugarClassification: metabolic.sugarClassification,
            addedSugarG: metabolic.addedSugarG,
            totalSugarG: metabolic.totalSugarG,
            giValue: metabolic.giValue,
            giCategory: metabolic.giCategory,
            glValue: metabolic.glValue,
            glCategory: metabolic.glCategory,
            clarificationQuestion: metabolic.clarificationQuestion,
            suggestedAlternative: metabolic.suggestedAlternative,
          },
        ];
        setItems(currentItems);
      } else {
        const trimmed = searchQuery.trim();
        const defaultG = 100;
        const baseNutrition: NutritionValues = {
          calories: 100,
          protein: 5,
          carbs: 10,
          fat: 3,
          fiber: 1,
        };
        const metabolic = resolveItemMetabolicDetails({
          foodName: trimmed,
          portionG: defaultG,
          carbsG: 10,
        });
        currentItems = [
          {
            id: `manual-custom-${Date.now()}`,
            foodName: trimmed,
            portionG: defaultG,
            baseNutritionPer100g: baseNutrition,
            nutrition: baseNutrition,
            isAiEstimated: false,
            sugarClassification: metabolic.sugarClassification,
            addedSugarG: metabolic.addedSugarG,
            totalSugarG: metabolic.totalSugarG,
            giValue: metabolic.giValue,
            giCategory: metabolic.giCategory,
            glValue: metabolic.glValue,
            glCategory: metabolic.glCategory,
            notes: "Món tự nhập thủ công",
          },
        ];
        setItems(currentItems);
      }
    }

    if (currentItems.length === 0) {
      setAnalysisError("Vui lòng thêm ít nhất một món ăn trước khi lưu.");
      return;
    }

    const hasAi = currentItems.some((it) => it.isAiEstimated);

    await onSaveMeal({
      mealType,
      eatenAt: vietnamDateTimeLocalToIso(eatenAtLocal),
      notes,
      analysisStatus: hasAi ? "ai_confirmed" : "manual",
      items: currentItems.map((it) => ({
        foodId: it.foodId,
        foodName: it.foodName,
        portionG: typeof it.portionG === "number" && it.portionG > 0 ? it.portionG : 100,
        nutrition: it.nutrition,
        isAiEstimated: it.isAiEstimated,
        confidence: it.confidence,
        nutritionSource: it.isAiEstimated ? "AI Vision" : "Danh mục Viện Dinh Dưỡng",
        sugarClassification: it.sugarClassification,
        addedSugarG: it.addedSugarG,
        totalSugarG: it.totalSugarG,
        giValue: it.giValue,
        giCategory: it.giCategory,
        glValue: it.glValue,
        glCategory: it.glCategory,
        metabolicNotes: it.clarificationQuestion,
      })),
    });

    onClose();
  };

  const filteredFoods = searchFoods(searchQuery);

  if (!isOpen) return null;

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
              onClick={() => {
                setMode("manual");
                setIsSearching(true);
              }}
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

          {/* Meal Date & Time Picker (Vietnam Time: UTC+7) */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                <span>Thời gian dùng bữa (Giờ Việt Nam):</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={eatenAtLocal}
                  onChange={(e) => setEatenAtLocal(e.target.value)}
                  className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-900 shadow-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Date Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-medium text-stone-500 mr-1">Chọn nhanh:</span>
              <button
                type="button"
                onClick={() => setEatenAtLocal(formatToVietnamDateTimeLocal(new Date()))}
                className="rounded-lg bg-white border border-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-700 hover:bg-stone-100 hover:border-emerald-500 transition"
              >
                Hiện tại
              </button>
              <button
                type="button"
                onClick={() => {
                  const todayStr = getLocalDateString();
                  setEatenAtLocal(`${todayStr}T08:00`);
                  setMealType("breakfast");
                }}
                className="rounded-lg bg-white border border-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-700 hover:bg-stone-100 hover:border-emerald-500 transition"
              >
                Sáng nay (08:00)
              </button>
              <button
                type="button"
                onClick={() => {
                  const todayStr = getLocalDateString();
                  setEatenAtLocal(`${todayStr}T12:30`);
                  setMealType("lunch");
                }}
                className="rounded-lg bg-white border border-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-700 hover:bg-stone-100 hover:border-emerald-500 transition"
              >
                Trưa nay (12:30)
              </button>
              <button
                type="button"
                onClick={() => {
                  const todayStr = getLocalDateString();
                  setEatenAtLocal(`${todayStr}T19:00`);
                  setMealType("dinner");
                }}
                className="rounded-lg bg-white border border-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-700 hover:bg-stone-100 hover:border-emerald-500 transition"
              >
                Tối nay (19:00)
              </button>
              <button
                type="button"
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  const yStr = getLocalDateString(yesterday);
                  setEatenAtLocal(`${yStr}T19:00`);
                  setMealType("dinner");
                }}
                className="rounded-lg bg-white border border-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-700 hover:bg-stone-100 hover:border-emerald-500 transition"
              >
                Tối hôm qua (19:00)
              </button>
            </div>
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
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 active:scale-95 transition"
                      >
                        <ImageIcon className="h-3.5 w-3.5 text-stone-500" />
                        <span>Thư viện ảnh</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 active:scale-95 transition"
                      >
                        <Camera className="h-3.5 w-3.5 text-stone-500" />
                        <span>Chụp ảnh mới</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAnalyzePhoto}
                        disabled={isAnalyzing}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50 active:scale-95 transition"
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
                  <div className="py-4 space-y-4">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-stone-800">
                        Thêm ảnh món ăn để AI ước lượng dinh dưỡng
                      </p>
                      <p className="text-xs text-stone-500">
                        Chụp trực tiếp từ camera hoặc chọn ảnh có sẵn trong thư viện
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                      {/* Nút 1: Chụp ảnh từ Camera */}
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/60 p-4 text-emerald-900 transition hover:bg-emerald-100 hover:border-emerald-500 active:scale-[0.98]"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                          <Camera className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold">Chụp ảnh</span>
                        <span className="text-[10px] text-emerald-700 font-medium">Mở máy ảnh</span>
                      </button>

                      {/* Nút 2: Tải từ Thư viện ảnh / Gallery */}
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-stone-200 bg-white p-4 text-stone-700 transition hover:bg-stone-50 hover:border-stone-400 active:scale-[0.98] shadow-sm"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold">Thư viện</span>
                        <span className="text-[10px] text-stone-500 font-medium">Chọn từ máy</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-stone-400">
                      Hỗ trợ JPEG, PNG, WebP (Tối đa 15MB). Tự động tối ưu dung lượng khi gửi.
                    </p>
                  </div>
                )}

                {/* Input 1: Máy ảnh trực tiếp (capture environment) */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = "";
                  }}
                  onChange={handleImageChange}
                />

                {/* Input 2: Thư viện ảnh (không dùng capture để mở gallery) */}
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = "";
                  }}
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

            {/* Quick Suggestions for Current Meal Type */}
            {(() => {
              const mealDishes = SUGGESTED_DISHES.filter((d) =>
                mealType === "snack"
                  ? d.category === "snack" || d.category === "afternoon"
                  : d.category === mealType,
              ).slice(0, 4);

              return (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="shrink-0 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-1 rounded-lg flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
                    Gợi ý nhanh:
                  </span>
                  {mealDishes.map((dish) => (
                    <button
                      key={dish.id}
                      type="button"
                      onClick={() => {
                        const defaultG = 200;
                        const newItem: EditableItem = {
                          id: `sug-${Date.now()}-${dish.id}`,
                          foodName: dish.name,
                          portionG: defaultG,
                          baseNutritionPer100g: {
                            calories: (dish.calories / defaultG) * 100,
                            protein: (dish.protein / defaultG) * 100,
                            carbs: (dish.carbohydrates / defaultG) * 100,
                            fat: (dish.fat / defaultG) * 100,
                            fiber: (dish.fiber / defaultG) * 100,
                          },
                          nutrition: {
                            calories: dish.calories,
                            protein: dish.protein,
                            carbs: dish.carbohydrates,
                            fat: dish.fat,
                            fiber: dish.fiber,
                          },
                          isAiEstimated: false,
                          sugarClassification: dish.addedSugar > 0 ? "ADDED_SUGAR" : "NO_KNOWN_SUGAR",
                          addedSugarG: dish.addedSugar,
                          totalSugarG: dish.addedSugar,
                          notes: "Món gợi ý theo thời điểm",
                        };
                        setItems((prev) => [...prev, newItem]);
                      }}
                      className="shrink-0 rounded-xl bg-white border border-stone-200 hover:border-emerald-400 hover:bg-emerald-50/50 px-2.5 py-1 text-[11px] font-medium text-stone-700 transition flex items-center gap-1.5 shadow-sm active:scale-95"
                      title="Bấm để thêm ngay món này"
                    >
                      <span>{dish.emoji}</span>
                      <span className="truncate max-w-[120px] font-semibold">{dish.name}</span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/60">
                        {dish.calories}kcal
                      </span>
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Manual Search Dropdown */}
            {isSearching && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (filteredFoods.length > 0) {
                          handleAddCatalogFood(filteredFoods[0]);
                        } else if (searchQuery.trim().length > 0) {
                          handleAddCustomFood(searchQuery.trim());
                        }
                      }
                    }}
                    placeholder="Tìm món Việt (Cà phê không đường, phở bò, ức gà, bún chả, cơm tấm...)"
                    className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-8 text-xs focus:border-emerald-500 focus:outline-none shadow-sm"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-stone-200/60 rounded-xl bg-white border border-stone-200 shadow-inner">
                  {filteredFoods.length > 0 ? (
                    filteredFoods.slice(0, 20).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleAddCatalogFood(f)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-emerald-50 transition"
                      >
                        <div className="pr-2">
                          <span className="font-semibold text-stone-900">{f.name}</span>
                          <span className="ml-2 text-[10px] text-stone-500">
                            {f.caloriesPer100g} kcal / 100g • {f.proteinPer100g}g P
                          </span>
                        </div>
                        <span className="shrink-0 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                          +{f.defaultPortionG}g
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-stone-500">
                      Không tìm thấy &quot;{searchQuery}&quot; trong danh mục có sẵn.
                    </div>
                  )}
                </div>

                {/* Instant fallback: Quick add custom food */}
                {searchQuery.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleAddCustomFood(searchQuery.trim())}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-emerald-500/50 bg-emerald-50/70 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition active:scale-[0.99]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Thêm nhanh món tùy chỉnh &quot;{searchQuery.trim()}&quot;</span>
                  </button>
                )}
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
                    className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm hover:border-emerald-300 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                            onChange={(e) => handlePortionChange(it.id, e.target.value)}
                            className="w-16 rounded-lg border border-stone-200 px-2 py-1 text-xs text-center font-bold text-stone-800 focus:border-emerald-500 focus:outline-none"
                            min="0"
                            step="5"
                          />
                          <span className="text-xs text-stone-500">g</span>
                        </div>

                        <div className="text-right min-w-[75px]">
                          <span className="text-xs font-bold text-stone-900">{round(it.nutrition.calories, 0)} kcal</span>
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[10px] text-emerald-600 font-semibold">{round(it.nutrition.protein, 1)}g P</span>
                            <button
                              type="button"
                              onClick={() => setEditingNutritionItemId(editingNutritionItemId === it.id ? null : it.id)}
                              className="text-[10px] text-stone-400 hover:text-emerald-700 underline"
                              title="Tùy chỉnh calo, đạm, carb, béo"
                            >
                              {editingNutritionItemId === it.id ? "Đóng" : "Sửa calo"}
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveItem(it.id)}
                          className="rounded-lg p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Direct Nutrition & Macro Fine-Tuning */}
                    {editingNutritionItemId === it.id && (
                      <div className="rounded-xl bg-stone-50 p-2.5 border border-stone-200 grid grid-cols-4 gap-2 text-center text-[10px]">
                        <div>
                          <label className="text-stone-500 block mb-0.5">Calo (kcal)</label>
                          <input
                            type="number"
                            min="0"
                            value={Math.round(it.nutrition.calories)}
                            onChange={(e) => handleDirectNutritionChange(it.id, "calories", Number(e.target.value))}
                            className="w-full rounded border border-stone-300 py-1 px-1 text-center font-bold text-stone-900 focus:border-emerald-500 focus:outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-emerald-700 block mb-0.5 font-semibold">Đạm (g)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={it.nutrition.protein}
                            onChange={(e) => handleDirectNutritionChange(it.id, "protein", Number(e.target.value))}
                            className="w-full rounded border border-stone-300 py-1 px-1 text-center font-bold text-emerald-700 focus:border-emerald-500 focus:outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-amber-700 block mb-0.5 font-semibold">Carb (g)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={it.nutrition.carbs}
                            onChange={(e) => handleDirectNutritionChange(it.id, "carbs", Number(e.target.value))}
                            className="w-full rounded border border-stone-300 py-1 px-1 text-center font-bold text-amber-700 focus:border-emerald-500 focus:outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-rose-700 block mb-0.5 font-semibold">Béo (g)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={it.nutrition.fat}
                            onChange={(e) => handleDirectNutritionChange(it.id, "fat", Number(e.target.value))}
                            className="w-full rounded border border-stone-300 py-1 px-1 text-center font-bold text-rose-700 focus:border-emerald-500 focus:outline-none bg-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* Metabolic Indicators & Clarification row */}
                    {metabolicPrefs.enabled && (
                      <div className="pt-1.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Sugar Classification Badge */}
                          {it.sugarClassification === "NO_KNOWN_SUGAR" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                              🍃 Không đường thêm (0g)
                            </span>
                          )}
                          {it.sugarClassification === "NATURAL_SUGAR" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 border border-teal-200/60">
                              🍎 Đường tự nhiên (~{it.totalSugarG || 0}g)
                            </span>
                          )}
                          {(it.sugarClassification === "ADDED_SUGAR" || it.sugarClassification === "BOTH_NATURAL_AND_ADDED") && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-300">
                              🍬 Đường thêm: +{it.addedSugarG || 0}g
                            </span>
                          )}
                          {it.sugarClassification === "UNKNOWN" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                              ❓ Chưa rõ đường
                            </span>
                          )}

                          {/* GI Badge */}
                          {it.giCategory === "high" && (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                              ⚡ GI Cao ({it.giValue || 70}+)
                            </span>
                          )}
                          {it.giCategory === "medium" && (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                              GI Vừa ({it.giValue || 56})
                            </span>
                          )}
                          {it.giCategory === "low" && (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                              GI Thấp ({it.giValue || 45})
                            </span>
                          )}
                        </div>

                        {/* Quick Sugar Adjustment Input */}
                        <div className="flex items-center gap-1 text-[10px] text-stone-500">
                          <span>Đường thêm:</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={it.addedSugarG ?? 0}
                            onChange={(e) => handleUpdateAddedSugar(it.id, Number(e.target.value))}
                            className="w-11 rounded border border-stone-200 px-1 py-0.5 text-center font-bold text-stone-800 focus:border-emerald-500 focus:outline-none"
                          />
                          <span>g</span>
                        </div>
                      </div>
                    )}

                    {/* Clarification prompt if available */}
                    {metabolicPrefs.enabled && it.clarificationQuestion && (
                      <div className="rounded-xl bg-amber-50/80 p-2.5 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                          <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
                          <span>{it.clarificationQuestion}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleQuickClarification(it.id, "NO_KNOWN_SUGAR", 0)}
                            className="rounded-lg bg-white border border-amber-300 px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 transition"
                          >
                            Không đường / Đen đá (0g)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickClarification(it.id, "BOTH_NATURAL_AND_ADDED", 5)}
                            className="rounded-lg bg-white border border-amber-300 px-2 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-50 transition"
                          >
                            Ít ngọt (+5g)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickClarification(it.id, "BOTH_NATURAL_AND_ADDED", 15)}
                            className="rounded-lg bg-white border border-amber-300 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-50 transition"
                          >
                            Chuẩn ngọt (+15g)
                          </button>
                        </div>
                      </div>
                    )}
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

          {/* Pre-Save Metabolic Guardrail Check */}
          {metabolicPrefs.enabled && currentMealMetabolic && items.length > 0 && (
            <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-amber-50/30 p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
                    <HeartPulse className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">
                      Đánh giá chuyển hóa & Đường / GI trước khi lưu
                    </h4>
                    <p className="text-[10px] text-stone-500">
                      Chế độ: {metabolicPrefs.strictness === "gentle" ? "Nhẹ nhàng" : metabolicPrefs.strictness === "strict" ? "Nghiêm ngặt" : "Cân bằng"} • Mục tiêu: {metabolicPrefs.dailyAddedSugarLimitG}g đường thêm
                    </p>
                  </div>
                </div>

                {/* Severity pill */}
                {currentMealMetabolic.riskSeverity === "LOW_CONCERN" && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                    ✅ Chuyển hóa an toàn
                  </span>
                )}
                {currentMealMetabolic.riskSeverity === "INFORMATION" && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-800 border border-blue-300">
                    ℹ️ Ghi nhận chuyển hóa
                  </span>
                )}
                {currentMealMetabolic.riskSeverity === "CAUTION" && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800 border border-amber-300">
                    ⚠️ Lưu ý đường / GI
                  </span>
                )}
                {currentMealMetabolic.riskSeverity === "HIGH_CONCERN" && (
                  <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-800 border border-rose-300 animate-pulse">
                    🚨 Vượt ngưỡng đường thêm
                  </span>
                )}
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                <div className="rounded-xl bg-white p-2 border border-stone-200 shadow-xs">
                  <span className="text-[10px] text-stone-500">Đường thêm bữa này</span>
                  <p className="text-sm font-bold text-stone-900">
                    +{currentMealMetabolic.mealAddedSugarG}g
                  </p>
                </div>
                <div className="rounded-xl bg-white p-2 border border-stone-200 shadow-xs">
                  <span className="text-[10px] text-stone-500">Tích lũy cả ngày</span>
                  <p className={`text-sm font-bold ${
                    currentMealMetabolic.cumulativeAddedSugarStatus === "EXCEEDED"
                      ? "text-rose-600"
                      : currentMealMetabolic.cumulativeAddedSugarStatus === "APPROACHING"
                      ? "text-amber-600"
                      : "text-emerald-700"
                  }`}>
                    {currentMealMetabolic.newProjectedDailyAddedSugarG} / {metabolicPrefs.dailyAddedSugarLimitG}g
                  </p>
                </div>
                <div className="rounded-xl bg-white p-2 border border-stone-200 shadow-xs">
                  <span className="text-[10px] text-stone-500">Tải đường huyết (GL)</span>
                  <p className="text-sm font-bold text-stone-900">
                    {currentMealMetabolic.mealGlValue} (
                    {currentMealMetabolic.mealGlCategory === "low"
                      ? "Thấp"
                      : currentMealMetabolic.mealGlCategory === "medium"
                      ? "Vừa"
                      : "Cao"}
                    )
                  </p>
                </div>
                <div className="rounded-xl bg-white p-2 border border-stone-200 shadow-xs">
                  <span className="text-[10px] text-stone-500">Khoảng cách bữa ăn</span>
                  <p className="text-sm font-bold text-stone-900">
                    {currentMealMetabolic.minutesSincePreviousMeal !== undefined
                      ? `${Math.round(currentMealMetabolic.minutesSincePreviousMeal / 60 * 10) / 10}h`
                      : "Bữa đầu ngày"}
                  </p>
                </div>
              </div>

              {/* Added Sugar Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-stone-500 font-medium">
                  <span>Hạn mức đường thêm (WHO/Metabolic target):</span>
                  <span>{Math.round((currentMealMetabolic.newProjectedDailyAddedSugarG / (metabolicPrefs.dailyAddedSugarLimitG || 25)) * 100)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
                  <div
                    className={`h-full transition-all duration-300 ${
                      currentMealMetabolic.cumulativeAddedSugarStatus === "EXCEEDED"
                        ? "bg-rose-500"
                        : currentMealMetabolic.cumulativeAddedSugarStatus === "APPROACHING"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round((currentMealMetabolic.newProjectedDailyAddedSugarG / (metabolicPrefs.dailyAddedSugarLimitG || 25)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Warnings and Constructive Tips */}
              {(currentMealMetabolic.warnings.length > 0 || currentMealMetabolic.constructiveAlternatives.length > 0) && (
                <div className="space-y-2 pt-1 text-xs">
                  {currentMealMetabolic.warnings.map((w, idx) => (
                    <div
                      key={`warn-${idx}`}
                      className="flex items-start gap-2 rounded-xl bg-amber-50/90 p-2.5 text-amber-900 border border-amber-200"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold">{w.title}</span>
                        <p className="text-[11px] leading-relaxed text-amber-800">{w.message}</p>
                      </div>
                    </div>
                  ))}

                  {currentMealMetabolic.constructiveAlternatives.length > 0 && (
                    <div className="flex items-start gap-2 rounded-xl bg-emerald-50/80 p-2.5 text-emerald-950 border border-emerald-200">
                      <Sparkles className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold">Gợi ý tối ưu chuyển hóa:</span>
                        <ul className="list-disc list-inside text-[11px] space-y-0.5 text-emerald-900">
                          {currentMealMetabolic.constructiveAlternatives.map((alt, idx) => (
                            <li key={`alt-${idx}`}>{alt}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
            disabled={items.length === 0 && !searchQuery.trim()}
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

