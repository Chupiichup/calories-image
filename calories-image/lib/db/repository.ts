/**
 * Data Repository Layer
 * 
 * Provides unified, typed data operations. When Supabase is configured and an
 * authenticated session exists, data persists to PostgreSQL with Row Level Security.
 * When in Demo/Offline mode, operations persist to browser localStorage with
 * seeded defaults, ensuring the entire application is fully functional and interactive.
 */

import { createClient } from "@/lib/supabase/client";
import { SEED_FOODS, type FoodItem } from "@/lib/data/seedFoods";
import { round, type BiologicalSex, type ActivityLevel, type WeightLossPace, type NutritionValues } from "@/lib/nutrition";
import {
  type MetabolicPreferences,
  DEFAULT_METABOLIC_PREFERENCES,
  type SugarClassification,
  type GiCategory,
  type GlCategory,
} from "@/lib/metabolic";

export type StoredProfile = {
  id: string;
  email?: string;
  dateOfBirth?: string;
  ageYears: number;
  heightCm: number;
  sexForBmr: BiologicalSex;
  activityLevel: ActivityLevel;
  updatedAt: string;
};

export type StoredGoal = {
  id: string;
  userId: string;
  currentWeightKg: number;
  goalWeightKg: number;
  dailyCalorieTarget: number;
  dailyProteinTargetG: number;
  dailyCarbTargetG: number;
  dailyFatTargetG: number;
  dailyFiberTargetG: number;
  weightLossPace: WeightLossPace;
  updatedAt: string;
  targetWeeks?: number;
  targetDate?: string;
};

export type StoredMealItem = {
  id: string;
  mealId: string;
  foodId?: string;
  foodNameSnapshot: string;
  portionG: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  nutritionSource: string;
  isAiEstimated: boolean;
  confidence?: number;
  sugarClassification?: SugarClassification;
  addedSugarG?: number;
  totalSugarG?: number;
  giValue?: number;
  giCategory?: GiCategory;
  glValue?: number;
  glCategory?: GlCategory;
  metabolicNotes?: string;
};

export type StoredMeal = {
  id: string;
  userId: string;
  eatenAt: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  notes?: string;
  analysisStatus: "manual" | "ai_pending" | "ai_confirmed" | "rejected";
  createdAt: string;
  items: StoredMealItem[];
};

export type StoredWeightEntry = {
  id: string;
  userId: string;
  recordedAt: string;
  weightKg: number;
  notes?: string;
};

const DEFAULT_PROFILE: StoredProfile = {
  id: "user-default",
  email: "",
  ageYears: 25,
  heightCm: 170,
  sexForBmr: "male",
  activityLevel: "moderate",
  updatedAt: new Date().toISOString(),
};

const DEFAULT_GOAL: StoredGoal = {
  id: "goal-default",
  userId: "user-default",
  currentWeightKg: 70.0,
  goalWeightKg: 65.0,
  dailyCalorieTarget: 2000,
  dailyProteinTargetG: 140,
  dailyCarbTargetG: 210,
  dailyFatTargetG: 60,
  dailyFiberTargetG: 28,
  weightLossPace: "moderate",
  updatedAt: new Date().toISOString(),
};

const DEFAULT_WEIGHT_ENTRIES: StoredWeightEntry[] = [];

const DEFAULT_MEALS: StoredMeal[] = [];

// Helper to validate standard UUID v4 format
export function isValidUUID(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

// Helper to get local YYYY-MM-DD date string strictly according to Vietnam timezone (Asia/Ho_Chi_Minh, UTC+7)
export function getLocalDateString(dateInput: Date | string = new Date()): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(d);
  } catch {
    // Fallback if Intl timeZone is not supported
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const vnDate = new Date(utc + 3600000 * 7);
    const year = vnDate.getFullYear();
    const month = String(vnDate.getMonth() + 1).padStart(2, "0");
    const day = String(vnDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

// Formats a Date into YYYY-MM-DDTHH:mm string in Vietnam Time (for datetime-local input)
export function formatToVietnamDateTimeLocal(dateInput: Date | string = new Date()): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    return formatToVietnamDateTimeLocal(new Date());
  }
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
    let hour = p.hour;
    if (hour === "24") hour = "00";
    return `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}`;
  } catch {
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const vn = new Date(utc + 3600000 * 7);
    const year = vn.getFullYear();
    const month = String(vn.getMonth() + 1).padStart(2, "0");
    const day = String(vn.getDate()).padStart(2, "0");
    const hour = String(vn.getHours()).padStart(2, "0");
    const minute = String(vn.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${minute}`;
  }
}

// Converts a Vietnam local datetime string (YYYY-MM-DDTHH:mm) into a standard ISO timestamp
export function vietnamDateTimeLocalToIso(vnDateTimeStr: string): string {
  if (!vnDateTimeStr) return new Date().toISOString();
  if (vnDateTimeStr.includes("Z") || vnDateTimeStr.includes("+")) {
    return new Date(vnDateTimeStr).toISOString();
  }
  const withSeconds = vnDateTimeStr.length === 16 ? `${vnDateTimeStr}:00` : vnDateTimeStr;
  const parsed = new Date(`${withSeconds}+07:00`);
  if (isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

// Helper to check if running in browser
const isBrowser = typeof window !== "undefined";

// In-memory store fallback for SSR & testing environments
const memoryStore = new Map<string, any>();

function getStorage<T>(key: string, fallback: T): T {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const val = window.localStorage.getItem(`calories_image_${key}`);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  }
  return memoryStore.has(key) ? (memoryStore.get(key) as T) : fallback;
}

function setStorage<T>(key: string, val: T): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(`calories_image_${key}`, JSON.stringify(val));
    } catch (err) {
      console.error("Local storage error:", err);
    }
  }
  memoryStore.set(key, val);
}

// Helper to deduplicate meals that share identical food/calories and meal type within a short time window
export function deduplicateMealList(meals: StoredMeal[]): { unique: StoredMeal[]; duplicateIds: string[] } {
  const unique: StoredMeal[] = [];
  const duplicateIds: string[] = [];

  for (const m of meals) {
    const mTime = new Date(m.eatenAt).getTime();
    const mDay = getLocalDateString(m.eatenAt);
    const mTotalCal = Math.round(
      (m.items || []).reduce((acc, it) => acc + (Number(it.calories) || 0), 0)
    );
    const mItemsSig = (m.items || [])
      .map((it) => `${it.foodNameSnapshot || (it as any).name || ""}_${Math.round(it.portionG || 0)}_${Math.round(it.calories || 0)}`)
      .sort()
      .join("|");

    const isDup = unique.some((existing) => {
      if (existing.id === m.id) return true;

      const existingDay = getLocalDateString(existing.eatenAt);
      if (existingDay !== mDay) return false;

      if (existing.mealType !== m.mealType) return false;

      const existingTime = new Date(existing.eatenAt).getTime();
      const timeDiffSec = Math.abs(mTime - existingTime) / 1000;

      const existingTotalCal = Math.round(
        (existing.items || []).reduce((acc, it) => acc + (Number(it.calories) || 0), 0)
      );

      const existingItemsSig = (existing.items || [])
        .map((it) => `${it.foodNameSnapshot || (it as any).name || ""}_${Math.round(it.portionG || 0)}_${Math.round(it.calories || 0)}`)
        .sort()
        .join("|");

      // Match 1: Identical items signature
      if (mItemsSig.length > 0 && mItemsSig === existingItemsSig) {
        return true;
      }

      // Match 2: Same calories (> 0) and recorded within 2 hours
      if (mTotalCal > 0 && mTotalCal === existingTotalCal && timeDiffSec < 7200) {
        return true;
      }

      // Match 3: Recorded within 60 seconds with same mealType
      if (timeDiffSec < 60 && mTotalCal === existingTotalCal) {
        return true;
      }

      return false;
    });

    if (isDup) {
      duplicateIds.push(m.id);
    } else {
      unique.push(m);
    }
  }

  return { unique, duplicateIds };
}

export const repository = {
  // 1. Profile & Goals
  async getProfile(): Promise<{ profile: StoredProfile; goal: StoredGoal }> {
    const supabase = createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        const { data: goal } = await supabase
          .from("nutrition_goals")
          .select("*")
          .eq("user_id", user.id)
          .order("effective_from", { ascending: false })
          .limit(1)
          .single();

        if (profile && goal) {
          let ageYears = 28;
          if (profile.date_of_birth) {
            const dob = new Date(profile.date_of_birth);
            if (!isNaN(dob.getTime())) {
              ageYears = Math.floor(
                (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
              );
            }
          } else {
            const localP = getStorage<StoredProfile>("profile", DEFAULT_PROFILE);
            if (localP && localP.ageYears) {
              ageYears = localP.ageYears;
            }
          }

          const resolvedProfile: StoredProfile = {
            id: profile.id,
            email: user.email,
            dateOfBirth: profile.date_of_birth,
            ageYears,
            heightCm: Number(profile.height_cm),
            sexForBmr: profile.sex_for_bmr,
            activityLevel: profile.activity_level,
            updatedAt: profile.updated_at,
          };
          const localG = getStorage<StoredGoal>("goal", DEFAULT_GOAL);
          const resolvedGoal: StoredGoal = {
            id: goal.id,
            userId: goal.user_id,
            currentWeightKg: Number(goal.current_weight_kg),
            goalWeightKg: Number(goal.goal_weight_kg),
            dailyCalorieTarget: Number(goal.daily_calorie_target),
            dailyProteinTargetG: Number(goal.daily_protein_target_g),
            dailyCarbTargetG: Number(goal.daily_carbohydrate_target_g),
            dailyFatTargetG: Number(goal.daily_fat_target_g),
            dailyFiberTargetG: Number(goal.daily_fiber_target_g),
            weightLossPace: goal.weight_loss_pace,
            targetWeeks: localG?.targetWeeks,
            targetDate: localG?.targetDate,
            updatedAt: goal.updated_at,
          };

          setStorage("profile", resolvedProfile);
          setStorage("goal", resolvedGoal);

          return { profile: resolvedProfile, goal: resolvedGoal };
        }
      }
    }

    // Demo/LocalStorage fallback
    const profile = getStorage<StoredProfile>("profile", DEFAULT_PROFILE);
    const goal = getStorage<StoredGoal>("goal", DEFAULT_GOAL);
    return { profile, goal };
  },

  async saveProfileAndGoal(
    profileInput: Omit<StoredProfile, "id" | "updatedAt">,
    goalInput: Omit<StoredGoal, "id" | "userId" | "updatedAt">,
  ): Promise<{ profile: StoredProfile; goal: StoredGoal }> {
    const supabase = createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Calculate date_of_birth from ageYears
        const birthYear = new Date().getFullYear() - (profileInput.ageYears || 28);
        const calculatedDob = `${birthYear}-01-01`;

        await supabase.from("profiles").upsert({
          id: user.id,
          date_of_birth: profileInput.dateOfBirth || calculatedDob,
          height_cm: profileInput.heightCm,
          sex_for_bmr: profileInput.sexForBmr,
          activity_level: profileInput.activityLevel,
          updated_at: new Date().toISOString(),
        });

        const validPaces = ["slow", "moderate", "aggressive"];
        const dbPace = validPaces.includes(goalInput.weightLossPace) ? goalInput.weightLossPace : "moderate";

        const { data: goalData } = await supabase
          .from("nutrition_goals")
          .insert({
            user_id: user.id,
            current_weight_kg: goalInput.currentWeightKg,
            goal_weight_kg: goalInput.goalWeightKg,
            daily_calorie_target: goalInput.dailyCalorieTarget,
            daily_protein_target_g: goalInput.dailyProteinTargetG,
            daily_carbohydrate_target_g: goalInput.dailyCarbTargetG,
            daily_fat_target_g: goalInput.dailyFatTargetG,
            daily_fiber_target_g: goalInput.dailyFiberTargetG,
            weight_loss_pace: dbPace,
          })
          .select()
          .single();

        const res = await this.getProfile();
        if (res.goal) {
          res.goal.targetWeeks = goalInput.targetWeeks;
          res.goal.targetDate = goalInput.targetDate;
          setStorage("goal", res.goal);
        }
        return res;
      }
    }

    const updatedProfile: StoredProfile = {
      ...profileInput,
      id: "demo-user-1",
      updatedAt: new Date().toISOString(),
    };
    const updatedGoal: StoredGoal = {
      ...goalInput,
      id: "demo-goal-1",
      userId: "demo-user-1",
      updatedAt: new Date().toISOString(),
    };

    setStorage("profile", updatedProfile);
    setStorage("goal", updatedGoal);
    return { profile: updatedProfile, goal: updatedGoal };
  },

  // 2. Meals
  async getMealsForDate(dateString: string): Promise<StoredMeal[]> {
    const supabase = createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Calculate timezone-aware local start and end of day
        const localStart = new Date(`${dateString}T00:00:00`);
        const localEnd = new Date(`${dateString}T23:59:59.999`);
        const start = isNaN(localStart.getTime()) ? `${dateString}T00:00:00.000Z` : localStart.toISOString();
        const end = isNaN(localEnd.getTime()) ? `${dateString}T23:59:59.999Z` : localEnd.toISOString();

        const { data: meals, error: mealsErr } = await supabase
          .from("meals")
          .select("*, meal_items(*)")
          .eq("user_id", user.id)
          .gte("eaten_at", start)
          .lte("eaten_at", end)
          .order("eaten_at", { ascending: true });

        if (mealsErr) {
          console.error("Supabase getMealsForDate error:", mealsErr);
        }

        if (meals && !mealsErr) {
          const rawMapped: StoredMeal[] = meals.map((m) => {
            const mappedItems = (m.meal_items || []).map((it: any) => ({
              id: it.id,
              mealId: it.meal_id,
              foodId: it.food_id,
              foodNameSnapshot: it.food_name_snapshot,
              portionG: Number(it.portion_g),
              calories: Number(it.calories),
              protein: Number(it.protein),
              carbs: Number(it.carbs),
              fat: Number(it.fat),
              fiber: Number(it.fiber),
              nutritionSource: it.nutrition_source,
              isAiEstimated: it.is_ai_estimated,
              confidence: it.confidence ? Number(it.confidence) : undefined,
              sugarClassification: it.sugar_classification || "UNKNOWN",
              addedSugarG: it.added_sugar_g !== null && it.added_sugar_g !== undefined ? Number(it.added_sugar_g) : 0,
              totalSugarG: it.total_sugar_g !== null && it.total_sugar_g !== undefined ? Number(it.total_sugar_g) : 0,
              giValue: it.gi_value ? Number(it.gi_value) : undefined,
              giCategory: it.gi_category || "unknown",
              glValue: it.gl_value !== null && it.gl_value !== undefined ? Number(it.gl_value) : undefined,
              glCategory: it.gl_category || "unknown",
              metabolicNotes: it.metabolic_notes || undefined,
            }));

            return {
              id: m.id,
              userId: m.user_id,
              eatenAt: m.eaten_at,
              mealType: m.meal_type,
              notes: m.notes,
              analysisStatus: m.analysis_status,
              createdAt: m.created_at,
              items: mappedItems,
            };
          });

          // Auto-deduplicate duplicate meals
          const { unique: deduped, duplicateIds } = deduplicateMealList(rawMapped);
          if (duplicateIds.length > 0) {
            console.log(`Auto-cleaning ${duplicateIds.length} duplicate meals from Supabase...`);
            supabase.from("meals").delete().in("id", duplicateIds).then();
          }

          setStorage("meals", deduped);
          return deduped;
        }
      }
    }

    const allMeals = getStorage<StoredMeal[]>("meals", DEFAULT_MEALS);
    const cleaned = allMeals.filter((m) => m.id !== "meal-1" && m.id !== "meal-2");
    const { unique: deduped } = deduplicateMealList(cleaned);
    setStorage("meals", deduped);
    return deduped.filter((m) => getLocalDateString(m.eatenAt) === dateString);
  },

  async getAllMeals(): Promise<StoredMeal[]> {
    const supabase = createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: meals, error: mealsErr } = await supabase
          .from("meals")
          .select("*, meal_items(*)")
          .eq("user_id", user.id)
          .order("eaten_at", { ascending: false });

        if (mealsErr) {
          console.error("Supabase getAllMeals error:", mealsErr);
        }

        if (meals && !mealsErr) {
          const rawMapped: StoredMeal[] = meals.map((m) => {
            const mappedItems = (m.meal_items || []).map((it: any) => ({
              id: it.id,
              mealId: it.meal_id,
              foodId: it.food_id,
              foodNameSnapshot: it.food_name_snapshot,
              portionG: Number(it.portion_g),
              calories: Number(it.calories),
              protein: Number(it.protein),
              carbs: Number(it.carbs),
              fat: Number(it.fat),
              fiber: Number(it.fiber),
              nutritionSource: it.nutrition_source,
              isAiEstimated: it.is_ai_estimated,
              confidence: it.confidence ? Number(it.confidence) : undefined,
              sugarClassification: it.sugar_classification || "UNKNOWN",
              addedSugarG: it.added_sugar_g !== null && it.added_sugar_g !== undefined ? Number(it.added_sugar_g) : 0,
              totalSugarG: it.total_sugar_g !== null && it.total_sugar_g !== undefined ? Number(it.total_sugar_g) : 0,
              giValue: it.gi_value ? Number(it.gi_value) : undefined,
              giCategory: it.gi_category || "unknown",
              glValue: it.gl_value !== null && it.gl_value !== undefined ? Number(it.gl_value) : undefined,
              glCategory: it.gl_category || "unknown",
              metabolicNotes: it.metabolic_notes || undefined,
            }));

            return {
              id: m.id,
              userId: m.user_id,
              eatenAt: m.eaten_at,
              mealType: m.meal_type,
              notes: m.notes,
              analysisStatus: m.analysis_status,
              createdAt: m.created_at,
              items: mappedItems,
            };
          });

          // Auto-deduplicate duplicate meals
          const { unique: deduped, duplicateIds } = deduplicateMealList(rawMapped);
          if (duplicateIds.length > 0) {
            console.log(`Auto-cleaning ${duplicateIds.length} duplicate meals from Supabase...`);
            supabase.from("meals").delete().in("id", duplicateIds).then();
          }

          setStorage("meals", deduped);
          return deduped;
        }
      }
    }

    const allMeals = getStorage<StoredMeal[]>("meals", DEFAULT_MEALS);
    const cleaned = allMeals.filter((m) => m.id !== "meal-1" && m.id !== "meal-2");
    const { unique: deduped } = deduplicateMealList(cleaned);
    setStorage("meals", deduped);
    return deduped;
  },

  async saveMeal(input: {
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
  }): Promise<StoredMeal> {
    const randSuffix = Math.random().toString(36).substring(2, 7);
    const mealId = `meal-${Date.now()}-${randSuffix}`;
    const newItems: StoredMealItem[] = input.items.map((it, idx) => ({
      id: `mi-${Date.now()}-${idx}-${randSuffix}`,
      mealId,
      foodId: it.foodId,
      foodNameSnapshot: it.foodName,
      portionG: Math.max(1, round(it.portionG || 100, 1)),
      calories: Math.max(0, round(it.nutrition?.calories || 0, 1)),
      protein: Math.max(0, round(it.nutrition?.protein || 0, 1)),
      carbs: Math.max(0, round(it.nutrition?.carbs || 0, 1)),
      fat: Math.max(0, round(it.nutrition?.fat || 0, 1)),
      fiber: Math.max(0, round(it.nutrition?.fiber || 0, 1)),
      nutritionSource: it.nutritionSource || (it.isAiEstimated ? "AI Vision" : "Thủ công"),
      isAiEstimated: Boolean(it.isAiEstimated),
      confidence: it.confidence ? Math.min(1, Math.max(0, Number(it.confidence))) : undefined,
      sugarClassification: it.sugarClassification || "UNKNOWN",
      addedSugarG: typeof it.addedSugarG === "number" ? round(it.addedSugarG, 1) : 0,
      totalSugarG: typeof it.totalSugarG === "number" ? round(it.totalSugarG, 1) : 0,
      giValue: it.giValue,
      giCategory: it.giCategory || "unknown",
      glValue: it.glValue,
      glCategory: it.glCategory || "unknown",
      metabolicNotes: it.metabolicNotes,
    }));

    const newMeal: StoredMeal = {
      id: mealId,
      userId: "demo-user-1",
      eatenAt: input.eatenAt,
      mealType: input.mealType,
      notes: input.notes,
      analysisStatus: input.analysisStatus,
      createdAt: new Date().toISOString(),
      items: newItems,
    };

    const supabase = createClient();
    if (supabase) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          newMeal.userId = user.id;
          const { data: dbMeal, error: mealErr } = await supabase
            .from("meals")
            .insert({
              user_id: user.id,
              eaten_at: input.eatenAt,
              meal_type: input.mealType,
              notes: input.notes || null,
              analysis_status: input.analysisStatus,
            })
            .select()
            .single();

          if (mealErr) {
            console.error("Supabase insert meal error:", mealErr);
          }

          if (dbMeal) {
            newMeal.id = dbMeal.id;

            // Important: validate food_id is UUID before DB insert, otherwise Postgres throws error 22P02
            const itemsToInsert = newItems.map((it) => ({
              meal_id: dbMeal.id,
              food_id: isValidUUID(it.foodId) ? it.foodId : null,
              food_name_snapshot: it.foodNameSnapshot,
              portion_g: it.portionG,
              calories: it.calories,
              protein: it.protein,
              carbs: it.carbs,
              fat: it.fat,
              fiber: it.fiber,
              nutrition_source: it.nutritionSource,
              is_ai_estimated: it.isAiEstimated,
              confidence: it.confidence || null,
              sugar_classification: it.sugarClassification || "UNKNOWN",
              added_sugar_g: typeof it.addedSugarG === "number" ? it.addedSugarG : 0,
              total_sugar_g: typeof it.totalSugarG === "number" ? it.totalSugarG : 0,
              gi_value: it.giValue ?? null,
              gi_category: it.giCategory || "unknown",
              gl_value: it.glValue ?? null,
              gl_category: it.glCategory || "unknown",
              metabolic_notes: it.metabolicNotes ?? null,
            }));

            const { error: itemsErr } = await supabase.from("meal_items").insert(itemsToInsert);
            if (itemsErr) {
              console.error("Supabase insert meal_items error:", itemsErr);
            }
          }
        }
      } catch (dbErr) {
        console.error("Supabase meal transaction exception:", dbErr);
      }
    }

    // Always update local storage for instant sync & demo
    const currentMeals = getStorage<StoredMeal[]>("meals", DEFAULT_MEALS);
    setStorage("meals", [newMeal, ...currentMeals]);

    return newMeal;
  },

  async deleteMeal(mealId: string): Promise<void> {
    const supabase = createClient();
    if (supabase) {
      await supabase.from("meals").delete().eq("id", mealId);
    }
    const currentMeals = getStorage<StoredMeal[]>("meals", DEFAULT_MEALS);
    setStorage(
      "meals",
      currentMeals.filter((m) => m.id !== mealId),
    );
  },

  async updateMeal(
    mealId: string,
    updates: {
      eatenAt?: string;
      mealType?: "breakfast" | "lunch" | "dinner" | "snack";
      notes?: string;
    },
  ): Promise<StoredMeal | null> {
    const supabase = createClient();
    if (supabase) {
      try {
        const dbPayload: any = {};
        if (updates.eatenAt) dbPayload.eaten_at = updates.eatenAt;
        if (updates.mealType) dbPayload.meal_type = updates.mealType;
        if (updates.notes !== undefined) dbPayload.notes = updates.notes;
        await supabase.from("meals").update(dbPayload).eq("id", mealId);
      } catch (err) {
        console.warn("Could not update meal in Supabase:", err);
      }
    }

    const currentMeals = getStorage<StoredMeal[]>("meals", DEFAULT_MEALS);
    let updated: StoredMeal | null = null;
    const nextList = currentMeals.map((m) => {
      if (m.id === mealId) {
        updated = {
          ...m,
          eatenAt: updates.eatenAt ?? m.eatenAt,
          mealType: updates.mealType ?? m.mealType,
          notes: updates.notes !== undefined ? updates.notes : m.notes,
        };
        return updated;
      }
      return m;
    });

    setStorage("meals", nextList);
    return updated;
  },

  async mergeMealsToDate(sourceDate: string, targetDate: string): Promise<number> {
    const supabase = createClient();
    const currentMeals = getStorage<StoredMeal[]>("meals", DEFAULT_MEALS);
    const updatedMeals: StoredMeal[] = [];
    let movedCount = 0;

    for (const meal of currentMeals) {
      const mealDate = getLocalDateString(meal.eatenAt);
      if (mealDate === sourceDate) {
        movedCount++;
        const vnTime = formatToVietnamDateTimeLocal(new Date(meal.eatenAt));
        const timePart = vnTime.split("T")[1] || "12:00";
        const newIso = vietnamDateTimeLocalToIso(`${targetDate}T${timePart}`);

        if (supabase) {
          try {
            await supabase.from("meals").update({ eaten_at: newIso }).eq("id", meal.id);
          } catch (e) {
            console.warn("Error updating meal date in Supabase:", e);
          }
        }

        updatedMeals.push({
          ...meal,
          eatenAt: newIso,
        });
      } else {
        updatedMeals.push(meal);
      }
    }

    setStorage("meals", updatedMeals);
    return movedCount;
  },

  // Sync unsynced local meals to Supabase safely (manual trigger only, deduplicated)
  async syncLocalMealsToSupabase(): Promise<void> {
    const supabase = createClient();
    if (!supabase) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const localMeals = getStorage<StoredMeal[]>("meals", DEFAULT_MEALS);
      if (!localMeals || localMeals.length === 0) return;

      // 1. Fetch remote meals with their meal_items
      const { data: remoteMeals } = await supabase
        .from("meals")
        .select("id, eaten_at, meal_type, meal_items(id, food_name_snapshot, calories)")
        .eq("user_id", user.id);

      if (!remoteMeals) return;

      // Deduplicate local meals first
      const { unique: dedupedLocal } = deduplicateMealList(localMeals);
      setStorage("meals", dedupedLocal);

      // 2. Iterate through local meals to repair or upload without duplicating
      for (const lm of dedupedLocal) {
        const lmTime = new Date(lm.eatenAt).getTime();
        const lmFingerprint = (lm.items || [])
          .map((it) => `${it.foodNameSnapshot || (it as any).name || ""}_${Math.round(it.calories || 0)}`)
          .sort()
          .join("|");

        const existingRemote = remoteMeals.find((rm: any) => {
          if (rm.id === lm.id) return true;
          const rmTime = new Date(rm.eaten_at).getTime();
          const timeDiff = Math.abs(lmTime - rmTime) / 1000;
          if (timeDiff < 30 && rm.meal_type === lm.mealType) return true;

          const rmFingerprint = (rm.meal_items || [])
            .map((it: any) => `${it.food_name_snapshot}_${Math.round(it.calories || 0)}`)
            .sort()
            .join("|");
          if (rmFingerprint.length > 0 && rmFingerprint === lmFingerprint) return true;
          return false;
        });

        if (!existingRemote) {
          // Meal does not exist in Supabase at all - upload it!
          const { data: dbMeal, error: mErr } = await supabase
            .from("meals")
            .insert({
              user_id: user.id,
              eaten_at: lm.eatenAt,
              meal_type: lm.mealType,
              notes: lm.notes || null,
              analysis_status: lm.analysisStatus,
            })
            .select()
            .single();

          if (dbMeal && !mErr && lm.items && lm.items.length > 0) {
            const itemsToInsert = lm.items.map((it) => ({
              meal_id: dbMeal.id,
              food_id: isValidUUID(it.foodId) ? it.foodId : null,
              food_name_snapshot: it.foodNameSnapshot,
              portion_g: it.portionG,
              calories: it.calories,
              protein: it.protein,
              carbs: it.carbs,
              fat: it.fat,
              fiber: it.fiber,
              nutrition_source: it.nutritionSource,
              is_ai_estimated: it.isAiEstimated,
              confidence: it.confidence || null,
            }));
            await supabase.from("meal_items").insert(itemsToInsert);
          }
        }
      }
    } catch (err) {
      console.error("Auto-sync to Supabase error:", err);
    }
  },

  // 3. Weight Tracking
  async getWeightEntries(): Promise<StoredWeightEntry[]> {
    const supabase = createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("weight_entries")
          .select("*")
          .eq("user_id", user.id)
          .order("recorded_at", { ascending: true });

        if (data && data.length > 0) {
          return data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            recordedAt: d.recorded_at,
            weightKg: Number(d.weight_kg),
            notes: d.notes,
          }));
        }
      }
    }

    const allWeights = getStorage<StoredWeightEntry[]>("weight_entries", DEFAULT_WEIGHT_ENTRIES);
    const cleaned = allWeights.filter((w) => !["w-1", "w-2", "w-3", "w-4"].includes(w.id));
    if (cleaned.length !== allWeights.length) {
      setStorage("weight_entries", cleaned);
    }
    return cleaned;
  },

  async addWeightEntry(entry: {
    weightKg: number;
    recordedAt: string;
    notes?: string;
  }): Promise<StoredWeightEntry> {
    const id = `w-${Date.now()}`;
    const newEntry: StoredWeightEntry = {
      id,
      userId: "demo-user-1",
      weightKg: entry.weightKg,
      recordedAt: entry.recordedAt,
      notes: entry.notes,
    };

    const supabase = createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        newEntry.userId = user.id;
        const { data } = await supabase
          .from("weight_entries")
          .insert({
            user_id: user.id,
            weight_kg: entry.weightKg,
            recordedAt: entry.recordedAt,
            notes: entry.notes,
          })
          .select()
          .single();

        if (data) {
          newEntry.id = data.id;
        }
      }
    }

    const current = getStorage<StoredWeightEntry[]>("weight_entries", DEFAULT_WEIGHT_ENTRIES);
    setStorage("weight_entries", [...current, newEntry]);
    return newEntry;
  },

  async deleteWeightEntry(id: string): Promise<void> {
    const supabase = createClient();
    if (supabase) {
      await supabase.from("weight_entries").delete().eq("id", id);
    }
    const current = getStorage<StoredWeightEntry[]>("weight_entries", DEFAULT_WEIGHT_ENTRIES);
    setStorage(
      "weight_entries",
      current.filter((e) => e.id !== id),
    );
  },

  // 4. Metabolic Health Preferences
  async getMetabolicPreferences(): Promise<MetabolicPreferences> {
    const supabase = createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: dbPrefs, error } = await supabase
          .from("metabolic_preferences")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (dbPrefs && !error) {
          const targetSugar = dbPrefs.daily_added_sugar_target_g !== null && dbPrefs.daily_added_sugar_target_g !== undefined ? Number(dbPrefs.daily_added_sugar_target_g) : 25;
          const isEnabled = Boolean(dbPrefs.metabolic_monitoring_enabled);
          const resolved: MetabolicPreferences = {
            enabled: isEnabled,
            metabolicMonitoringEnabled: isEnabled,
            strictness: dbPrefs.strictness || "balanced",
            focusFattyLiver: Boolean(dbPrefs.fatty_liver_consideration),
            fattyLiverConsideration: Boolean(dbPrefs.fatty_liver_consideration),
            focusHighInsulin: Boolean(dbPrefs.high_insulin_consideration),
            highInsulinConsideration: Boolean(dbPrefs.high_insulin_consideration),
            addedSugarMonitoringEnabled: Boolean(dbPrefs.added_sugar_monitoring_enabled),
            giMonitoringEnabled: Boolean(dbPrefs.gi_monitoring_enabled),
            mealTimingMonitoringEnabled: Boolean(dbPrefs.meal_timing_monitoring_enabled),
            mealFrequencyMonitoringEnabled: Boolean(dbPrefs.meal_frequency_monitoring_enabled),
            dailyAddedSugarLimitG: targetSugar,
            dailyAddedSugarTargetG: targetSugar,
            dailyTotalSugarTargetG: dbPrefs.daily_total_sugar_target_g !== null && dbPrefs.daily_total_sugar_target_g !== undefined ? Number(dbPrefs.daily_total_sugar_target_g) : undefined,
            dailyGlycemicLoadTarget: dbPrefs.daily_glycemic_load_target !== null && dbPrefs.daily_glycemic_load_target !== undefined ? Number(dbPrefs.daily_glycemic_load_target) : undefined,
            preferredMealsPerDay: Number(dbPrefs.preferred_meals_per_day) || 3,
            minMealIntervalMinutes: Number(dbPrefs.minimum_meal_interval_minutes) || 180,
            minimumMealIntervalMinutes: Number(dbPrefs.minimum_meal_interval_minutes) || 180,
            preferredFirstMealTime: dbPrefs.preferred_first_meal_time || "07:00",
            preferredLastMealTime: dbPrefs.preferred_last_meal_time || "19:30",
            warnMorningHighGi: Boolean(dbPrefs.morning_high_gi_warning_enabled),
            morningHighGiWarningEnabled: Boolean(dbPrefs.morning_high_gi_warning_enabled),
            morningWindowStart: dbPrefs.morning_window_start || "05:00",
            morningWindowEnd: dbPrefs.morning_window_end || "09:30",
            showAlternatives: true,
            customDietaryNotes: dbPrefs.custom_dietary_notes || "",
          };
          setStorage("metabolic_preferences", resolved);
          return resolved;
        }
      }
    }

    const local = getStorage<MetabolicPreferences>("metabolic_preferences", DEFAULT_METABOLIC_PREFERENCES);
    return {
      ...DEFAULT_METABOLIC_PREFERENCES,
      ...local,
      enabled: local.enabled ?? local.metabolicMonitoringEnabled ?? DEFAULT_METABOLIC_PREFERENCES.enabled,
      metabolicMonitoringEnabled: local.metabolicMonitoringEnabled ?? local.enabled ?? DEFAULT_METABOLIC_PREFERENCES.metabolicMonitoringEnabled,
      dailyAddedSugarLimitG: local.dailyAddedSugarLimitG ?? local.dailyAddedSugarTargetG ?? DEFAULT_METABOLIC_PREFERENCES.dailyAddedSugarLimitG,
      dailyAddedSugarTargetG: local.dailyAddedSugarTargetG ?? local.dailyAddedSugarLimitG ?? DEFAULT_METABOLIC_PREFERENCES.dailyAddedSugarTargetG,
      minMealIntervalMinutes: local.minMealIntervalMinutes ?? local.minimumMealIntervalMinutes ?? DEFAULT_METABOLIC_PREFERENCES.minMealIntervalMinutes,
      minimumMealIntervalMinutes: local.minimumMealIntervalMinutes ?? local.minMealIntervalMinutes ?? DEFAULT_METABOLIC_PREFERENCES.minimumMealIntervalMinutes,
      focusFattyLiver: local.focusFattyLiver ?? local.fattyLiverConsideration ?? DEFAULT_METABOLIC_PREFERENCES.focusFattyLiver,
      fattyLiverConsideration: local.fattyLiverConsideration ?? local.focusFattyLiver ?? DEFAULT_METABOLIC_PREFERENCES.fattyLiverConsideration,
      focusHighInsulin: local.focusHighInsulin ?? local.highInsulinConsideration ?? DEFAULT_METABOLIC_PREFERENCES.focusHighInsulin,
      highInsulinConsideration: local.highInsulinConsideration ?? local.focusHighInsulin ?? DEFAULT_METABOLIC_PREFERENCES.highInsulinConsideration,
      warnMorningHighGi: local.warnMorningHighGi ?? local.morningHighGiWarningEnabled ?? DEFAULT_METABOLIC_PREFERENCES.warnMorningHighGi,
      morningHighGiWarningEnabled: local.morningHighGiWarningEnabled ?? local.warnMorningHighGi ?? DEFAULT_METABOLIC_PREFERENCES.morningHighGiWarningEnabled,
    };
  },

  async saveMetabolicPreferences(prefs: MetabolicPreferences): Promise<MetabolicPreferences> {
    const normalized: MetabolicPreferences = {
      ...prefs,
      enabled: prefs.enabled ?? prefs.metabolicMonitoringEnabled ?? true,
      metabolicMonitoringEnabled: prefs.metabolicMonitoringEnabled ?? prefs.enabled ?? true,
      dailyAddedSugarLimitG: prefs.dailyAddedSugarLimitG ?? prefs.dailyAddedSugarTargetG ?? 25,
      dailyAddedSugarTargetG: prefs.dailyAddedSugarTargetG ?? prefs.dailyAddedSugarLimitG ?? 25,
      minMealIntervalMinutes: prefs.minMealIntervalMinutes ?? prefs.minimumMealIntervalMinutes ?? 180,
      minimumMealIntervalMinutes: prefs.minimumMealIntervalMinutes ?? prefs.minMealIntervalMinutes ?? 180,
      focusFattyLiver: prefs.focusFattyLiver ?? prefs.fattyLiverConsideration ?? true,
      fattyLiverConsideration: prefs.fattyLiverConsideration ?? prefs.focusFattyLiver ?? true,
      focusHighInsulin: prefs.focusHighInsulin ?? prefs.highInsulinConsideration ?? true,
      highInsulinConsideration: prefs.highInsulinConsideration ?? prefs.focusHighInsulin ?? true,
      warnMorningHighGi: prefs.warnMorningHighGi ?? prefs.morningHighGiWarningEnabled ?? true,
      morningHighGiWarningEnabled: prefs.morningHighGiWarningEnabled ?? prefs.warnMorningHighGi ?? true,
    };
    setStorage("metabolic_preferences", normalized);

    const supabase = createClient();
    if (supabase) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await supabase.from("metabolic_preferences").upsert({
            user_id: user.id,
            metabolic_monitoring_enabled: normalized.enabled,
            strictness: normalized.strictness,
            fatty_liver_consideration: normalized.focusFattyLiver,
            high_insulin_consideration: normalized.focusHighInsulin,
            added_sugar_monitoring_enabled: normalized.addedSugarMonitoringEnabled ?? true,
            gi_monitoring_enabled: normalized.giMonitoringEnabled ?? true,
            meal_timing_monitoring_enabled: normalized.mealTimingMonitoringEnabled ?? true,
            meal_frequency_monitoring_enabled: normalized.mealFrequencyMonitoringEnabled ?? true,
            daily_added_sugar_target_g: normalized.dailyAddedSugarLimitG,
            daily_total_sugar_target_g: normalized.dailyTotalSugarTargetG ?? null,
            daily_glycemic_load_target: normalized.dailyGlycemicLoadTarget ?? null,
            preferred_meals_per_day: normalized.preferredMealsPerDay ?? 3,
            minimum_meal_interval_minutes: normalized.minMealIntervalMinutes,
            preferred_first_meal_time: normalized.preferredFirstMealTime || "07:00",
            preferred_last_meal_time: normalized.preferredLastMealTime || "19:30",
            morning_high_gi_warning_enabled: normalized.warnMorningHighGi,
            morning_window_start: normalized.morningWindowStart || "05:00",
            morning_window_end: normalized.morningWindowEnd || "09:30",
            custom_dietary_notes: normalized.customDietaryNotes || null,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Save metabolic preferences to Supabase error:", err);
      }
    }

    return normalized;
  },

  // 5. Data Export & Restore
  async exportAllData(): Promise<string> {
    const { profile, goal } = await this.getProfile();
    const meals = await this.getAllMeals();
    const weights = await this.getWeightEntries();

    const exportBundle = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      profile,
      goal,
      weightEntries: weights,
      meals,
      foodsCatalogue: SEED_FOODS,
    };

    return JSON.stringify(exportBundle, null, 2);
  },

  async importData(jsonContent: string): Promise<{ success: boolean; message: string }> {
    try {
      const data = JSON.parse(jsonContent);
      if (!data.profile || !data.goal) {
        return { success: false, message: "Tệp sao lưu không đúng định dạng chuẩn." };
      }

      setStorage("profile", data.profile);
      setStorage("goal", data.goal);
      if (Array.isArray(data.meals)) {
        setStorage("meals", data.meals);
      }
      if (Array.isArray(data.weightEntries)) {
        setStorage("weight_entries", data.weightEntries);
      }

      return { success: true, message: "Khôi phục dữ liệu thành công!" };
    } catch (e: any) {
      return { success: false, message: `Lỗi đọc tệp: ${e.message}` };
    }
  },

  resetAllData(): void {
    if (!isBrowser) return;
    try {
      localStorage.removeItem("calories_image_meals");
      localStorage.removeItem("calories_image_weight_entries");
      localStorage.removeItem("calories_image_profile");
      localStorage.removeItem("calories_image_goal");
    } catch (e) {
      console.error("Reset error:", e);
    }
  },
};

