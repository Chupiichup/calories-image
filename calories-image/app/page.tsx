"use client";

import React, { useState, useEffect } from "react";
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

  // Load data whenever selectedDate changes
  const loadData = async (dateForDiary?: string) => {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      loadData(selectedDate);
    }
  }, [selectedDate]);

  // Handler: Open Meal Logger Modal
  const handleOpenMealLog = (mode: "photo" | "manual") => {
    setMealLoggerMode(mode);
    setIsMealLoggerOpen(true);
  };

  // Handler: Save Meal
  const handleSaveMeal = async (mealData: any) => {
    await repository.saveMeal(mealData);
    const todayStr = getLocalDateString();
    setSelectedDate(todayStr);
    await loadData(todayStr);
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
          />
        )}

        {currentTab === "history" && (
          <HistoryTab meals={allMeals} goal={goal} />
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
