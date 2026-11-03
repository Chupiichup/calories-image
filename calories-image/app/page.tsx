"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navigation, type TabType } from "@/app/components/Navigation";
import { DashboardTab } from "@/app/components/DashboardTab";
import { DiaryTab } from "@/app/components/DiaryTab";
import { HistoryTab } from "@/app/components/HistoryTab";
import { WeightTab } from "@/app/components/WeightTab";
import { ProfileTab } from "@/app/components/ProfileTab";
import { SettingsTab } from "@/app/components/SettingsTab";
import { MealSuggestionsTab } from "@/app/components/MealSuggestionsTab";
import { MealLoggerModal } from "@/app/components/MealLoggerModal";
import { AuthModal } from "@/app/components/AuthModal";
import {
  repository,
  getLocalDateString,
  type StoredProfile,
  type StoredGoal,
  type StoredMeal,
  type StoredWeightEntry,
} from "@/lib/db/repository";
import { type MetabolicPreferences } from "@/lib/metabolic";
import { type MealTimeCategory, type SuggestedDish } from "@/lib/data/mealSuggestionsData";
import { generateNutritionCoachingInsights } from "@/lib/coaching";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [currentTab, setCurrentTab] = useState<TabType>("dashboard");
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Suggestions & metabolic state
  const [metabolicPrefs, setMetabolicPrefs] = useState<MetabolicPreferences | null>(null);
  const [suggestionsCategory, setSuggestionsCategory] = useState<MealTimeCategory | undefined>(undefined);
  const [prefilledMealData, setPrefilledMealData] = useState<{
    mealType?: "breakfast" | "lunch" | "dinner" | "snack";
    items?: any[];
  } | null>(null);

  // Current authenticated user state
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Core reactive data states
  const [profile, setProfile] = useState<StoredProfile | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const v = window.localStorage.getItem("calories_image_profile");
        return v ? JSON.parse(v) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [goal, setGoal] = useState<StoredGoal | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const v = window.localStorage.getItem("calories_image_goal");
        return v ? JSON.parse(v) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [todayMeals, setTodayMeals] = useState<StoredMeal[]>([]);
  const [diaryMeals, setDiaryMeals] = useState<StoredMeal[]>([]);
  const [allMeals, setAllMeals] = useState<StoredMeal[]>([]);
  const [weightEntries, setWeightEntries] = useState<StoredWeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isMealLoggerOpen, setIsMealLoggerOpen] = useState(false);
  const [mealLoggerMode, setMealLoggerMode] = useState<"photo" | "manual">("photo");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);

  // Initialize selected date on client mount
  useEffect(() => {
    const today = getLocalDateString();
    setSelectedDate(today);
  }, []);

  // Load data whenever selectedDate changes
  const loadData = useCallback(async (dateForDiary?: string, showLoading = false) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const isSupabaseActive = isSupabaseConfigured();
      setIsDemoMode(!isSupabaseActive);

      const todayStr = getLocalDateString();
      const targetDiaryDate = dateForDiary || selectedDate || todayStr;

      // Parallelize queries with Promise.all for fast non-blocking load
      const [profileGoalRes, mealsTodayRes, mealsDiaryRes, allRes, weightsRes, mPrefsRes] = await Promise.all([
        repository.getProfile(),
        repository.getMealsForDate(todayStr),
        targetDiaryDate === todayStr ? Promise.resolve(null) : repository.getMealsForDate(targetDiaryDate),
        repository.getAllMeals(),
        repository.getWeightEntries(),
        repository.getMetabolicPreferences(),
      ]);

      setProfile(profileGoalRes.profile);
      setGoal(profileGoalRes.goal);
      setTodayMeals(mealsTodayRes);
      setDiaryMeals(targetDiaryDate === todayStr ? mealsTodayRes : (mealsDiaryRes || []));
      setAllMeals(allRes);
      setWeightEntries(weightsRes);
      if (mPrefsRes) setMetabolicPrefs(mPrefsRes);
    } catch (err) {
      console.error("Error loading nutrition coach data:", err);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [selectedDate]);

  // Listen to Supabase Auth state and session
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setCurrentUser(null);
      setIsDemoMode(true);
      return;
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser({ id: user.id, email: user.email });
        setIsDemoMode(false);
      } else {
        setCurrentUser(null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser({ id: session.user.id, email: session.user.email });
        setIsDemoMode(false);
      } else {
        setCurrentUser(null);
      }
      loadData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Auto-refresh when tab is focused or becomes visible (silent cross-device sync)
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        loadData(undefined, false);
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [selectedDate]);

  // Realtime subscription for cross-device updates (debounced & silent)
  useEffect(() => {
    const supabase = createClient();
    if (!supabase || !currentUser) return;

    let debounceTimer: NodeJS.Timeout | null = null;
    const triggerSilentReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadData(undefined, false);
      }, 1000);
    };

    const channel = supabase
      .channel("cross-device-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meals" },
        triggerSilentReload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meal_items" },
        triggerSilentReload,
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [currentUser, selectedDate, loadData]);

  useEffect(() => {
    if (selectedDate) {
      loadData(selectedDate);
    }
  }, [selectedDate, loadData]);

  // Handler: Manual Sync Button
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await repository.syncLocalMealsToSupabase();
      await loadData(undefined, false);
    } catch (err) {
      console.error("Manual sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handler: Open Meal Logger Modal
  const handleOpenMealLog = (mode: "photo" | "manual") => {
    setMealLoggerMode(mode);
    setIsMealLoggerOpen(true);
  };

  // Handler: Save Meal
  const handleSaveMeal = async (mealData: any) => {
    try {
      await repository.saveMeal(mealData);
      const mealDate = getLocalDateString(mealData.eatenAt);
      setSelectedDate(mealDate);
      await loadData(mealDate, false);
      setCurrentTab("diary");
    } catch (err) {
      console.error("Error saving meal:", err);
    }
  };

  // Handler: Update Meal Time / Type / Items
  const handleUpdateMeal = async (
    mealId: string,
    updates: {
      eatenAt?: string;
      mealType?: "breakfast" | "lunch" | "dinner" | "snack";
      notes?: string;
      items?: any[];
    },
  ) => {
    await repository.updateMeal(mealId, updates);
    const targetDate = updates.eatenAt ? getLocalDateString(updates.eatenAt) : selectedDate;
    setSelectedDate(targetDate);
    await loadData(targetDate, false);
  };

  // Handler: Select Date from History to open Diary
  const handleSelectDateForDiary = (date: string) => {
    setSelectedDate(date);
    setCurrentTab("diary");
  };

  // Handler: Delete Meal
  const handleDeleteMeal = async (mealId: string) => {
    await repository.deleteMeal(mealId);
    await loadData(selectedDate, false);
  };

  // Handler: Add Weight Entry
  const handleAddWeight = async (entry: any) => {
    await repository.addWeightEntry(entry);
    await loadData();
  };

  // Handler: Delete Weight Entry
  const handleDeleteWeight = async (id: string) => {
    await repository.deleteWeightEntry(id);
    await loadData();
  };

  // Handler: Save Profile & Goal
  const handleSaveProfileAndGoal = async (pInput: any, gInput: any) => {
    const { profile: updatedP, goal: updatedG } = await repository.saveProfileAndGoal(
      pInput,
      gInput,
    );
    setProfile(updatedP);
    setGoal(updatedG);
  };

  // Handler: Open Suggestions Tab with optional initial category
  const handleOpenSuggestions = (cat?: MealTimeCategory) => {
    setSuggestionsCategory(cat);
    setCurrentTab("suggestions");
  };

  // Handler: Log Suggested Dish (Quick 1-click or customize in modal)
  const handleLogSuggestedDish = async (
    dish: SuggestedDish,
    options?: { customizeFirst?: boolean },
  ) => {
    const mealType: "breakfast" | "lunch" | "dinner" | "snack" =
      dish.category === "afternoon" ? "snack" : dish.category;

    if (options?.customizeFirst) {
      setPrefilledMealData({
        mealType,
        items: [
          {
            foodName: dish.name,
            portionG: 250,
            nutrition: {
              calories: dish.calories,
              protein: dish.protein,
              carbs: dish.carbohydrates,
              fat: dish.fat,
              fiber: dish.fiber,
            },
            addedSugarG: dish.addedSugar,
            totalSugarG: dish.addedSugar,
          },
        ],
      });
      setMealLoggerMode("manual");
      setIsMealLoggerOpen(true);
    } else {
      // 1-click quick log into today's diary
      await repository.saveMeal({
        mealType,
        eatenAt: new Date().toISOString(),
        notes: `Gợi ý theo thời điểm: ${dish.name}`,
        analysisStatus: "manual",
        items: [
          {
            foodName: dish.name,
            portionG: 250,
            nutrition: {
              calories: dish.calories,
              protein: dish.protein,
              carbs: dish.carbohydrates,
              fat: dish.fat,
              fiber: dish.fiber,
            },
            isAiEstimated: false,
            nutritionSource: "Thực đơn gợi ý món theo thời điểm",
            addedSugarG: dish.addedSugar,
            totalSugarG: dish.addedSugar,
          },
        ],
      });
      const todayStr = getLocalDateString();
      setSelectedDate(todayStr);
      await loadData(todayStr, false);
      setCurrentTab("diary");
    }
  };

  // Handler: Sign Out
  const handleSignOut = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
      setCurrentUser(null);
      await loadData();
    }
  };

  if (isLoading || !profile || !goal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-r-transparent" />
          <p className="text-xs font-semibold text-stone-600">Đang tải dữ liệu dinh dưỡng...</p>
        </div>
      </div>
    );
  }

  const coachingInsights = generateNutritionCoachingInsights({
    todayMeals,
    goal,
  });

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 pb-20 lg:pb-12">
      {/* Navigation Header */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === "log-meal") {
            handleOpenMealLog("photo");
          } else {
            setCurrentTab(tab);
          }
        }}
        isDemoMode={isDemoMode}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        currentUser={currentUser}
        onSync={handleManualSync}
        isSyncing={isSyncing}
      />

      {/* Main Tab Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {currentTab === "dashboard" && (
          <DashboardTab
            profile={profile}
            goal={goal}
            todayMeals={todayMeals}
            recentWeights={weightEntries}
            coachingInsights={coachingInsights}
            onOpenMealLog={handleOpenMealLog}
            onSelectTab={(tab) => {
              if (tab === "suggestions") {
                handleOpenSuggestions();
              } else {
                setCurrentTab(tab);
              }
            }}
          />
        )}

        {currentTab === "suggestions" && (
          <MealSuggestionsTab
            initialCategory={suggestionsCategory}
            profile={profile}
            goal={goal}
            metabolicPrefs={metabolicPrefs}
            onLogDish={handleLogSuggestedDish}
            onNavigateToDiary={() => {
              setSelectedDate(getLocalDateString());
              setCurrentTab("diary");
            }}
          />
        )}

        {currentTab === "diary" && (
          <DiaryTab
            meals={diaryMeals}
            goal={goal}
            selectedDate={selectedDate || getLocalDateString()}
            onDateChange={setSelectedDate}
            onOpenMealLog={handleOpenMealLog}
            onDeleteMeal={handleDeleteMeal}
            onViewSuggestions={(cat) => handleOpenSuggestions(cat as any)}
            onUpdateMeal={handleUpdateMeal}
          />
        )}

        {currentTab === "history" && (
          <HistoryTab
            meals={allMeals}
            goal={goal}
            onSelectDateForDiary={handleSelectDateForDiary}
          />
        )}

        {currentTab === "weight" && (
          <WeightTab
            entries={weightEntries}
            goal={goal}
            onAddEntry={handleAddWeight}
            onDeleteEntry={handleDeleteWeight}
          />
        )}

        {currentTab === "profile" && (
          <ProfileTab
            profile={profile}
            goal={goal}
            onSave={handleSaveProfileAndGoal}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onSignOut={handleSignOut}
          />
        )}

        {currentTab === "settings" && <SettingsTab />}
      </main>

      {/* Meal Logger Modal (Photo Vision & Manual) */}
      <MealLoggerModal
        isOpen={isMealLoggerOpen}
        initialMode={mealLoggerMode}
        prefilledMealType={prefilledMealData?.mealType}
        prefilledItems={prefilledMealData?.items}
        onClose={() => {
          setIsMealLoggerOpen(false);
          setPrefilledMealData(null);
        }}
        onSaveMeal={handleSaveMeal}
      />

      {/* Supabase Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        isDemoMode={isDemoMode}
        onToggleDemoMode={setIsDemoMode}
      />
    </div>
  );
}
