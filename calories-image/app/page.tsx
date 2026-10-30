"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navigation, type TabType } from "@/app/components/Navigation";
import { DashboardTab } from "@/app/components/DashboardTab";
import { DiaryTab } from "@/app/components/DiaryTab";
import { HistoryTab } from "@/app/components/HistoryTab";
import { WeightTab } from "@/app/components/WeightTab";
import { ProfileTab } from "@/app/components/ProfileTab";
import { SettingsTab } from "@/app/components/SettingsTab";
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
import { generateNutritionCoachingInsights } from "@/lib/coaching";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [currentTab, setCurrentTab] = useState<TabType>("dashboard");
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Current authenticated user state
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Core reactive data states
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [goal, setGoal] = useState<StoredGoal | null>(null);
  const [todayMeals, setTodayMeals] = useState<StoredMeal[]>([]);
  const [diaryMeals, setDiaryMeals] = useState<StoredMeal[]>([]);
  const [allMeals, setAllMeals] = useState<StoredMeal[]>([]);
  const [weightEntries, setWeightEntries] = useState<StoredWeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isMealLoggerOpen, setIsMealLoggerOpen] = useState(false);
  const [mealLoggerMode, setMealLoggerMode] = useState<"photo" | "manual">("photo");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);

  // Initialize selected date on client mount
  useEffect(() => {
    setSelectedDate(getLocalDateString());
  }, []);

  // Load data whenever selectedDate changes
  const loadData = useCallback(async (dateForDiary?: string, showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const isSupabaseActive = isSupabaseConfigured();
      setIsDemoMode(!isSupabaseActive);

      const todayStr = getLocalDateString();
      const targetDiaryDate = dateForDiary || selectedDate || todayStr;

      const { profile: p, goal: g } = await repository.getProfile();
      setProfile(p);
      setGoal(g);

      // ALWAYS load today's meals for Dashboard metrics & remaining calories
      const mealsToday = await repository.getMealsForDate(todayStr);
      setTodayMeals(mealsToday);

      // Load diary meals for the selected date
      if (targetDiaryDate === todayStr) {
        setDiaryMeals(mealsToday);
      } else {
        const mealsSelected = await repository.getMealsForDate(targetDiaryDate);
        setDiaryMeals(mealsSelected);
      }

      const all = await repository.getAllMeals();
      setAllMeals(all);

      const weights = await repository.getWeightEntries();
      setWeightEntries(weights);
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
    await repository.saveMeal(mealData);
    const mealDate = getLocalDateString(mealData.eatenAt);
    setSelectedDate(mealDate);
    await loadData(mealDate);
  };

  // Handler: Update Meal Time / Type
  const handleUpdateMeal = async (
    mealId: string,
    updates: {
      eatenAt?: string;
      mealType?: "breakfast" | "lunch" | "dinner" | "snack";
      notes?: string;
    },
  ) => {
    await repository.updateMeal(mealId, updates);
    await loadData(selectedDate);
  };

  // Handler: Merge meals from one day to another
  const handleMergeMeals = async (sourceDate: string, targetDate: string) => {
    await repository.mergeMealsToDate(sourceDate, targetDate);
    setSelectedDate(targetDate);
    await loadData(targetDate);
  };

  // Handler: Select Date from History to open Diary
  const handleSelectDateForDiary = (date: string) => {
    setSelectedDate(date);
    setCurrentTab("diary");
  };

  // Handler: Delete Meal
  const handleDeleteMeal = async (mealId: string) => {
    await repository.deleteMeal(mealId);
    await loadData(selectedDate);
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
            onSelectTab={setCurrentTab}
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
            onUpdateMeal={handleUpdateMeal}
          />
        )}

        {currentTab === "history" && (
          <HistoryTab
            meals={allMeals}
            goal={goal}
            onMergeMeals={handleMergeMeals}
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
        onClose={() => setIsMealLoggerOpen(false)}
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
