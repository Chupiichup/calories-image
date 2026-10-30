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
import type { BiologicalSex, ActivityLevel, WeightLossPace, NutritionValues } from "@/lib/nutrition";

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

// Helper to check if running in browser
const isBrowser = typeof window !== "undefined";

function getStorage<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const val = localStorage.getItem(`calories_image_${key}`);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage<T>(key: string, val: T): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(`calories_image_${key}`, JSON.stringify(val));
  } catch (err) {
    console.error("Local storage error:", err);
  }
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
          return {
            profile: {
              id: profile.id,
              email: user.email,
              dateOfBirth: profile.date_of_birth,
              ageYears: profile.date_of_birth
                ? Math.floor(
                    (Date.now() - new Date(profile.date_of_birth).getTime()) /
                      (365.25 * 24 * 60 * 60 * 1000),
                  )
                : 28,
              heightCm: Number(profile.height_cm),
              sexForBmr: profile.sex_for_bmr,
              activityLevel: profile.activity_level,
              updatedAt: profile.updated_at,
            },
            goal: {
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
              updatedAt: goal.updated_at,
            },
          };
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
        await supabase.from("profiles").upsert({
          id: user.id,
          height_cm: profileInput.heightCm,
          sex_for_bmr: profileInput.sexForBmr,
          activity_level: profileInput.activityLevel,
          updated_at: new Date().toISOString(),
        });

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
            weight_loss_pace: goalInput.weightLossPace,
          })
          .select()
          .single();

        return this.getProfile();
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
        const start = `${dateString}T00:00:00.000Z`;
        const end = `${dateString}T23:59:59.999Z`;

        const { data: meals } = await supabase
          .from("meals")
          .select("*, meal_items(*)")
          .eq("user_id", user.id)
          .gte("eaten_at", start)
          .lte("eaten_at", end)
          .order("eaten_at", { ascending: true });

        if (meals) {
          return meals.map((m) => ({
            id: m.id,
            userId: m.user_id,
            eatenAt: m.eaten_at,
            mealType: m.meal_type,
            notes: m.notes,
            analysisStatus: m.analysis_status,
            createdAt: m.created_at,
            items: (m.meal_items || []).map((it: any) => ({
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
            })),
          }));
        }
      }
    }

    const allMeals = getStorage<StoredMeal[]>("meals", DEFAULT_MEALS);
    const cleaned = allMeals.filter((m) => m.id !== "meal-1" && m.id !== "meal-2");
    if (cleaned.length !== allMeals.length) {
      setStorage("meals", cleaned);
    }
    return cleaned.filter((m) => m.eatenAt.startsWith(dateString));
  },

  async getAllMeals(): Promise<StoredMeal[]> {
    const supabase = createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: meals } = await supabase
          .from("meals")
          .select("*, meal_items(*)")
          .eq("user_id", user.id)
          .order("eaten_at", { ascending: false });

        if (meals) {
          return meals.map((m) => ({
            id: m.id,
            userId: m.user_id,
            eatenAt: m.eaten_at,
            mealType: m.meal_type,
            notes: m.notes,
            analysisStatus: m.analysis_status,
            createdAt: m.created_at,
            items: (m.meal_items || []).map((it: any) => ({
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
            })),
          }));
        }
      }
    }

    const allMeals = getStorage<StoredMeal[]>("meals", DEFAULT_MEALS);
    const cleaned = allMeals.filter((m) => m.id !== "meal-1" && m.id !== "meal-2");
    if (cleaned.length !== allMeals.length) {
      setStorage("meals", cleaned);
    }
    return cleaned;
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
    }>;
  }): Promise<StoredMeal> {
    const mealId = `meal-${Date.now()}`;
    const newItems: StoredMealItem[] = input.items.map((it, idx) => ({
      id: `mi-${Date.now()}-${idx}`,
      mealId,
      foodId: it.foodId,
      foodNameSnapshot: it.foodName,
      portionG: it.portionG,
      calories: it.nutrition.calories,
      protein: it.nutrition.protein,
      carbs: it.nutrition.carbs,
      fat: it.nutrition.fat,
      fiber: it.nutrition.fiber,
      nutritionSource: it.nutritionSource || (it.isAiEstimated ? "AI Vision" : "Thủ công"),
      isAiEstimated: Boolean(it.isAiEstimated),
      confidence: it.confidence,
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        newMeal.userId = user.id;
        const { data: dbMeal } = await supabase
          .from("meals")
          .insert({
            user_id: user.id,
            eaten_at: input.eatenAt,
            meal_type: input.mealType,
            notes: input.notes,
            analysis_status: input.analysisStatus,
          })
          .select()
          .single();

        if (dbMeal) {
          const itemsToInsert = input.items.map((it) => ({
            meal_id: dbMeal.id,
            food_id: it.foodId || null,
            food_name_snapshot: it.foodName,
            portion_g: it.portionG,
            calories: it.nutrition.calories,
            protein: it.nutrition.protein,
            carbs: it.nutrition.carbs,
            fat: it.nutrition.fat,
            fiber: it.nutrition.fiber,
            nutrition_source: it.nutritionSource || (it.isAiEstimated ? "AI Vision" : "Thủ công"),
            is_ai_estimated: Boolean(it.isAiEstimated),
            confidence: it.confidence || null,
          }));

          await supabase.from("meal_items").insert(itemsToInsert);
          newMeal.id = dbMeal.id;
        }
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

  // 4. Data Export & Restore
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

