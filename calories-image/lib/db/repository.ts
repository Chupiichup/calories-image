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

// Helper to validate standard UUID v4 format
export function isValidUUID(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

// Helper to get local YYYY-MM-DD date string according to device timezone
export function getLocalDateString(dateInput: Date | string = new Date()): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
          const localMeals = getStorage<StoredMeal[]>("meals", DEFAULT_MEALS);
          return meals.map((m) => {
            let mappedItems = (m.meal_items || []).map((it: any) => ({
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
            }));

            // Fallback recovery: if meal_items is empty in DB (e.g. from previously failed UUID insert),
            // recover full items and macros from local backup AND auto-repair in Supabase
            if (mappedItems.length === 0) {
              const matched = localMeals.find(
                (lm) => lm.id === m.id || lm.eatenAt === m.eaten_at,
              );
              if (matched && matched.items && matched.items.length > 0) {
                mappedItems = matched.items;
                // Auto-repair in Supabase so other devices (e.g. laptop) get the items too!
                const itemsToRepair = matched.items.map((it) => ({
                  meal_id: m.id,
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
                supabase.from("meal_items").insert(itemsToRepair).then();
              }
            }

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
        }
      }
    }

    const allMeals = getStorage<StoredMeal[]>("meals", DEFAULT_MEALS);
    const cleaned = allMeals.filter((m) => m.id !== "meal-1" && m.id !== "meal-2");
    if (cleaned.length !== allMeals.length) {
      setStorage("meals", cleaned);
    }
    return cleaned.filter((m) => getLocalDateString(m.eatenAt) === dateString);
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
          const localMeals = getStorage<StoredMeal[]>("meals", DEFAULT_MEALS);
          return meals.map((m) => {
            let mappedItems = (m.meal_items || []).map((it: any) => ({
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
            }));

            if (mappedItems.length === 0) {
              const matched = localMeals.find(
                (lm) => lm.id === m.id || lm.eatenAt === m.eaten_at,
              );
              if (matched && matched.items && matched.items.length > 0) {
                mappedItems = matched.items;
                // Auto-repair in Supabase
                const itemsToRepair = matched.items.map((it) => ({
                  meal_id: m.id,
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
                supabase.from("meal_items").insert(itemsToRepair).then();
              }
            }

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
      portionG: Math.max(1, round(it.portionG || 100, 1)),
      calories: Math.max(0, round(it.nutrition?.calories || 0, 1)),
      protein: Math.max(0, round(it.nutrition?.protein || 0, 1)),
      carbs: Math.max(0, round(it.nutrition?.carbs || 0, 1)),
      fat: Math.max(0, round(it.nutrition?.fat || 0, 1)),
      fiber: Math.max(0, round(it.nutrition?.fiber || 0, 1)),
      nutritionSource: it.nutritionSource || (it.isAiEstimated ? "AI Vision" : "Thủ công"),
      isAiEstimated: Boolean(it.isAiEstimated),
      confidence: it.confidence ? Math.min(1, Math.max(0, Number(it.confidence))) : undefined,
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

  // Auto-sync unsynced local meals and repair empty meal_items in Supabase
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
        .select("id, eaten_at, meal_items(id)")
        .eq("user_id", user.id);

      const remoteMealMap = new Map<string, { id: string; itemCount: number }>();
      (remoteMeals || []).forEach((rm: any) => {
        remoteMealMap.set(rm.eaten_at, {
          id: rm.id,
          itemCount: Array.isArray(rm.meal_items) ? rm.meal_items.length : 0,
        });
      });

      // 2. Iterate through local meals to repair or upload
      for (const lm of localMeals) {
        const existingRemote = remoteMealMap.get(lm.eatenAt);

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
        } else if (existingRemote.itemCount === 0 && lm.items && lm.items.length > 0) {
          // Meal exists in Supabase, but meal_items was empty (repair it!)
          const itemsToInsert = lm.items.map((it) => ({
            meal_id: existingRemote.id,
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

