"use client";

import React, { useState } from "react";
import {
  User,
  Target,
  Sparkles,
  ShieldAlert,
  Save,
  CheckCircle2,
  Info,
  LogIn,
  LogOut,
  ShieldCheck,
  Cloud,
  Clock,
  Calendar,
  ArrowRight,
  TrendingDown,
  Activity,
  HeartPulse,
  Candy,
  Timer,
  Sliders,
} from "lucide-react";
import { repository, type StoredProfile, type StoredGoal } from "@/lib/db/repository";
import {
  type MetabolicPreferences,
  DEFAULT_METABOLIC_PREFERENCES,
  type StrictnessLevel,
} from "@/lib/metabolic";
import {
  calculateComprehensiveTargets,
  ACTIVITY_MULTIPLIER,
  round,
  type BiologicalSex,
  type ActivityLevel,
  type WeightLossPace,
  type TargetCalculationOptions,
} from "@/lib/nutrition";

interface ProfileTabProps {
  profile: StoredProfile;
  goal: StoredGoal;
  onSave: (
    updatedProfile: Omit<StoredProfile, "id" | "updatedAt">,
    updatedGoal: Omit<StoredGoal, "id" | "userId" | "updatedAt">,
  ) => Promise<void>;
  currentUser?: { id: string; email?: string } | null;
  onOpenAuth?: () => void;
  onSignOut?: () => void | Promise<void>;
}

export function ProfileTab({
  profile,
  goal,
  onSave,
  currentUser,
  onOpenAuth,
  onSignOut,
}: ProfileTabProps) {
  const [age, setAge] = useState<number | "">(profile.ageYears);
  const [height, setHeight] = useState<number | "">(profile.heightCm);
  const [currentWeight, setCurrentWeight] = useState<number | "">(goal.currentWeightKg);
  const [goalWeight, setGoalWeight] = useState<number | "">(goal.goalWeightKg);
  const [sex, setSex] = useState<BiologicalSex>(profile.sexForBmr);
  const [activity, setActivity] = useState<ActivityLevel>(profile.activityLevel);
  const [pace, setPace] = useState<WeightLossPace>(goal.weightLossPace);
  const [targetMode, setTargetMode] = useState<"duration" | "pace">(() =>
    goal.targetWeeks ? "duration" : "duration",
  );
  const [customWeeks, setCustomWeeks] = useState<number | "">(() => {
    if (goal.targetWeeks && goal.targetWeeks > 0) return goal.targetWeeks;
    return 40;
  });

  const [isSpecialPregnant, setIsSpecialPregnant] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [metabolicPrefs, setMetabolicPrefs] = useState<MetabolicPreferences>(DEFAULT_METABOLIC_PREFERENCES);

  React.useEffect(() => {
    repository.getMetabolicPreferences().then((res) => {
      if (res) setMetabolicPrefs(res);
    });
  }, []);

  // Sync form inputs if parent profile/goal props update
  React.useEffect(() => {
    if (profile) {
      setAge(profile.ageYears);
      setHeight(profile.heightCm);
      setSex(profile.sexForBmr);
      setActivity(profile.activityLevel);
    }
  }, [profile]);

  React.useEffect(() => {
    if (goal) {
      setCurrentWeight(goal.currentWeightKg);
      setGoalWeight(goal.goalWeightKg);
      setPace(goal.weightLossPace);
      if (goal.targetWeeks && goal.targetWeeks > 0) {
        setCustomWeeks(goal.targetWeeks);
      }
    }
  }, [goal]);

  const weightToLose =
    typeof currentWeight === "number" &&
    typeof goalWeight === "number" &&
    currentWeight > goalWeight
      ? round(currentWeight - goalWeight, 1)
      : 0;

  const calculationOptions: TargetCalculationOptions =
    targetMode === "duration" && typeof customWeeks === "number" && customWeeks > 0
      ? { targetWeeks: customWeeks }
      : { pace };

  // Compute live deterministic preview of targets
  const calculated = calculateComprehensiveTargets(
    {
      weightKg: typeof currentWeight === "number" && currentWeight > 0 ? currentWeight : 70,
      heightCm: typeof height === "number" && height > 0 ? height : 170,
      ageYears: typeof age === "number" && age > 0 ? age : 25,
      sex,
      activityLevel: activity,
      goalWeightKg: typeof goalWeight === "number" && goalWeight > 0 ? goalWeight : undefined,
      isPregnantOrNursing: isSpecialPregnant,
      isUnder18: typeof age === "number" && age < 18,
    },
    calculationOptions,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (age === "" || height === "" || currentWeight === "" || goalWeight === "") {
      return;
    }
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      let derivedPace: WeightLossPace = pace;
      if (calculated.deficitPercent <= 17.5) {
        derivedPace = "slow";
      } else if (calculated.deficitPercent <= 22.5) {
        derivedPace = "moderate";
      } else {
        derivedPace = "aggressive";
      }

      await onSave(
        {
          email: profile.email,
          ageYears: Number(age),
          heightCm: Number(height),
          sexForBmr: sex,
          activityLevel: activity,
        },
        {
          currentWeightKg: Number(currentWeight),
          goalWeightKg: Number(goalWeight),
          dailyCalorieTarget: calculated.isBelowSafetyFloor
            ? calculated.safeCalorieTarget
            : calculated.calorieTarget,
          dailyProteinTargetG: calculated.macros.protein,
          dailyCarbTargetG: calculated.macros.carbs,
          dailyFatTargetG: calculated.macros.fat,
          dailyFiberTargetG: calculated.macros.fiber,
          weightLossPace: derivedPace,
          targetWeeks: calculated.timeline.targetWeeks,
          targetDate: calculated.timeline.estimatedCompletionDate,
        },
      );
      await repository.saveMetabolicPreferences(metabolicPrefs);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Info & Status Card */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xl shadow-md shadow-emerald-500/20">
              {currentUser?.email ? (
                currentUser.email.charAt(0).toUpperCase()
              ) : (
                <User className="h-7 w-7 text-white" />
              )}
              {currentUser && (
                <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-stone-900">
                  {currentUser?.email ? currentUser.email : "Tài khoản Khách (Chưa đăng nhập)"}
                </h2>
                {currentUser ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Đã đăng nhập Supabase Cloud
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
                    Lưu trữ cục bộ thiết bị
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                {currentUser
                  ? `Mã định danh (UID): ${currentUser.id.slice(0, 8)}... - Dữ liệu dinh dưỡng được phân tách và bảo vệ an toàn theo tài khoản riêng.`
                  : "Dữ liệu hiện chỉ lưu trên trình duyệt của máy này. Hãy đăng nhập để lưu trữ trên Cloud và đồng bộ khi dùng trên điện thoại."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={onSignOut}
                className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 active:scale-95 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Đăng xuất</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Đăng nhập / Đăng ký</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Safety Notice regarding medical disclaimer */}
      <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Lưu ý an toàn sức khỏe & y khoa:</p>
          <p className="leading-relaxed">
            Các chỉ số BMR, TDEE và mục tiêu calo thâm hụt dựa trên phương trình Mifflin-St Jeor và khuyến nghị bảo toàn cơ bắp khoa học. Ứng dụng không thay thế chẩn đoán y khoa. Không áp dụng thâm hụt calo nếu bạn dưới 18 tuổi hoặc đang mang thai/cho con bú.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Inputs (2 Cols) */}
        <div className="lg:col-span-2 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
            <User className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-stone-900">Thông số cơ thể & Mức vận động</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-700">Tuổi:</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                min="10"
                max="100"
                required
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700">Chiều cao (cm):</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value === "" ? "" : Number(e.target.value))}
                min="100"
                max="250"
                required
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700">Cân nặng hiện tại (kg):</label>
              <input
                type="number"
                step="0.1"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value === "" ? "" : Number(e.target.value))}
                min="30"
                max="250"
                required
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700">Mục tiêu cân nặng (kg):</label>
              <input
                type="number"
                step="0.1"
                value={goalWeight}
                onChange={(e) => setGoalWeight(e.target.value === "" ? "" : Number(e.target.value))}
                min="30"
                max="250"
                required
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Biological Sex */}
          <div>
            <label className="text-xs font-semibold text-stone-700">
              Giới tính sinh học (cần thiết cho phương trình chuyển hóa BMR Mifflin-St Jeor):
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                { id: "male", label: "Nam" },
                { id: "female", label: "Nữ" },
                { id: "prefer_not_to_say", label: "Trung bình" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSex(s.id as BiologicalSex)}
                  className={`rounded-xl py-2 text-xs font-semibold transition ${
                    sex === s.id
                      ? "bg-emerald-600 text-white shadow"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <label className="text-xs font-semibold text-stone-700">Mức độ hoạt động thể chất:</label>
            <div className="mt-2 space-y-2">
              {Object.entries(ACTIVITY_MULTIPLIER).map(([key, item]) => (
                <div
                  key={key}
                  onClick={() => setActivity(key as ActivityLevel)}
                  className={`cursor-pointer rounded-2xl border p-3 transition ${
                    activity === key
                      ? "border-emerald-500 bg-emerald-50/60"
                      : "border-stone-200 bg-stone-50 hover:bg-stone-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900">{item.label}</span>
                    <span className="text-[11px] font-semibold text-emerald-700">x{item.factor} TDEE</span>
                  </div>
                  <p className="mt-1 text-[11px] text-stone-500">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Deficit Mode & Target Timeline Section */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
              <div>
                <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <span>Mục tiêu thâm hụt & Thời gian dự kiến về đích</span>
                </label>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Bạn có thể chỉnh thời gian giảm cân mong muốn (calo thay đổi theo) hoặc chọn theo % thâm hụt
                </p>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="flex items-center rounded-xl bg-stone-200/70 p-1 text-xs font-semibold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setTargetMode("duration");
                    if (!customWeeks && calculated.timeline.targetWeeks > 0) {
                      setCustomWeeks(calculated.timeline.targetWeeks);
                    }
                  }}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    targetMode === "duration"
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Theo Thời gian
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode("pace")}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    targetMode === "pace"
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Theo Tốc độ %
                </button>
              </div>
            </div>

            {weightToLose <= 0 ? (
              <div className="rounded-xl bg-white p-3 border border-stone-200 text-xs text-stone-600 text-center">
                Mục tiêu cân nặng của bạn lớn hơn hoặc bằng cân nặng hiện tại (duy trì hoặc tăng cân).
              </div>
            ) : targetMode === "duration" ? (
              /* DURATION ADJUSTMENT CONTROLS */
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-stone-700">
                    Thời gian giảm cân mục tiêu:
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-emerald-700">
                      {customWeeks || calculated.timeline.targetWeeks}
                    </span>
                    <span className="text-xs font-bold text-stone-600">tuần</span>
                    <span className="text-xs text-stone-400">
                      (~{round((Number(customWeeks) || calculated.timeline.targetWeeks) / 4.33, 1)} tháng)
                    </span>
                  </div>
                </div>

                {/* Slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min={Math.max(8, Math.floor(calculated.timeline.minSafeWeeks * 0.7))}
                    max={Math.max(104, calculated.timeline.minSafeWeeks + 52)}
                    step={1}
                    value={typeof customWeeks === "number" ? customWeeks : calculated.timeline.targetWeeks}
                    onChange={(e) => setCustomWeeks(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-stone-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 px-0.5">
                    <span>Nhanh ({Math.max(8, Math.floor(calculated.timeline.minSafeWeeks * 0.7))} tuần)</span>
                    <span>An toàn tối thiểu ({calculated.timeline.minSafeWeeks} tuần)</span>
                    <span>Dài hạn ({Math.max(104, calculated.timeline.minSafeWeeks + 52)} tuần)</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-stone-600">Mốc thời gian gợi ý nhanh:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomWeeks(calculated.timeline.minSafeWeeks)}
                      className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold border transition ${
                        customWeeks === calculated.timeline.minSafeWeeks
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      ⚡ Nhanh an toàn ({calculated.timeline.minSafeWeeks} tuần - {calculated.safeCalorieTarget} kcal)
                    </button>
                    {calculated.timeline.minSafeWeeks <= 26 && (
                      <button
                        type="button"
                        onClick={() => setCustomWeeks(26)}
                        className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold border transition ${
                          customWeeks === 26
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                        }`}
                      >
                        6 tháng (26 tuần)
                      </button>
                    )}
                    {calculated.timeline.minSafeWeeks <= 39 && (
                      <button
                        type="button"
                        onClick={() => setCustomWeeks(39)}
                        className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold border transition ${
                          customWeeks === 39
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                        }`}
                      >
                        9 tháng (39 tuần)
                      </button>
                    )}
                    {calculated.timeline.minSafeWeeks <= 52 && (
                      <button
                        type="button"
                        onClick={() => setCustomWeeks(52)}
                        className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold border transition ${
                          customWeeks === 52
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                        }`}
                      >
                        1 năm (52 tuần)
                      </button>
                    )}
                    {calculated.timeline.idealWeeks > calculated.timeline.minSafeWeeks && (
                      <button
                        type="button"
                        onClick={() => setCustomWeeks(calculated.timeline.idealWeeks)}
                        className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold border transition ${
                          customWeeks === calculated.timeline.idealWeeks
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                        }`}
                      >
                        🌿 Thoải mái ({calculated.timeline.idealWeeks} tuần)
                      </button>
                    )}
                    {calculated.timeline.gentleWeeks > calculated.timeline.idealWeeks && (
                      <button
                        type="button"
                        onClick={() => setCustomWeeks(calculated.timeline.gentleWeeks)}
                        className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold border transition ${
                          customWeeks === calculated.timeline.gentleWeeks
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                        }`}
                      >
                        🍃 Rất nhẹ nhàng ({calculated.timeline.gentleWeeks} tuần)
                      </button>
                    )}
                  </div>
                </div>

                {/* Direct Number Input */}
                <div className="flex items-center gap-2 pt-1">
                  <label className="text-xs text-stone-600 whitespace-nowrap">Hoặc nhập số tuần cụ thể:</label>
                  <input
                    type="number"
                    min="4"
                    max="200"
                    value={customWeeks}
                    onChange={(e) => setCustomWeeks(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-24 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-900 focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-xs text-stone-500">tuần</span>
                </div>

                {/* Live Real-Time Dynamic Feedback Card */}
                <div className="rounded-xl bg-white p-3.5 border border-stone-200 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-stone-500 block text-[11px]">Calo nạp mỗi ngày:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-extrabold text-base ${
                            calculated.isBelowSafetyFloor ? "text-rose-600" : "text-emerald-700"
                          }`}
                        >
                          {calculated.calorieTarget} kcal
                        </span>
                        {calculated.isBelowSafetyFloor && (
                          <span className="inline-flex items-center rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                            Dưới sàn {calculated.absoluteSafetyFloor}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[11px]">Thâm hụt mỗi ngày:</span>
                      <span
                        className={`font-extrabold text-sm ${
                          calculated.isBelowSafetyFloor ? "text-rose-700" : "text-stone-800"
                        }`}
                      >
                        {calculated.deficitKcal} kcal ({calculated.deficitPercent}%)
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-stone-500 block text-[11px]">Tốc độ giảm mỡ:</span>
                      <span className="font-bold text-stone-900 text-xs">
                        ~{calculated.timeline.weeklyWeightChangeKg} kg / tuần
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-stone-600 font-medium">Ngày dự kiến đạt {goalWeight}kg:</span>
                    <span className="font-bold text-stone-900">
                      {calculated.timeline.formattedCompletionDate}
                    </span>
                  </div>
                </div>

                {/* Safety evaluation box */}
                <div
                  className={`rounded-xl p-3 text-xs leading-relaxed border ${
                    calculated.isBelowSafetyFloor
                      ? "bg-rose-50 border-rose-200 text-rose-800"
                      : calculated.timeline.safetyStatus === "aggressive_warning"
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-emerald-50 border-emerald-200 text-emerald-800"
                  }`}
                >
                  <p>{calculated.timeline.safetyMessage}</p>
                  {calculated.isBelowSafetyFloor && (
                    <div className="mt-2.5 pt-2 border-t border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[11px] text-rose-700 font-medium">
                        Khuyến nghị: Tăng lên tối thiểu <strong>{calculated.timeline.minSafeWeeks} tuần</strong> để nạp an toàn <strong>{calculated.safeCalorieTarget} kcal/ngày</strong>.
                      </span>
                      <button
                        type="button"
                        onClick={() => setCustomWeeks(calculated.timeline.minSafeWeeks)}
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-800 transition shrink-0"
                      >
                        <span>Áp dụng mốc an toàn ({calculated.timeline.minSafeWeeks} tuần)</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* PACE SELECTION CONTROLS */
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "slow", label: "Chậm (15%)", desc: "Giữ cơ tối đa" },
                    { id: "moderate", label: "Vừa phải (20%)", desc: "Khuyên dùng chuẩn" },
                    { id: "aggressive", label: "Nhanh (25%)", desc: "Thâm hụt tối đa" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPace(p.id as WeightLossPace);
                      }}
                      className={`rounded-2xl p-2.5 text-center transition ${
                        pace === p.id
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      <p className="text-xs font-bold">{p.label}</p>
                      <p className={`text-[10px] ${pace === p.id ? "text-emerald-100" : "text-stone-500"}`}>
                        {p.desc}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="rounded-xl bg-white p-3 border border-stone-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Thời gian dự kiến:</span>
                    <span className="font-bold text-stone-900">
                      {calculated.timeline.targetWeeks} tuần (~{calculated.timeline.targetMonths} tháng)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Ngày về đích dự kiến:</span>
                    <span className="font-bold text-emerald-700">
                      {calculated.timeline.formattedCompletionDate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Tốc độ giảm dự kiến:</span>
                    <span className="font-semibold text-stone-800">
                      ~{calculated.timeline.weeklyWeightChangeKg} kg / tuần
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Special Condition Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-700">
              <input
                type="checkbox"
                checked={isSpecialPregnant}
                onChange={(e) => setIsSpecialPregnant(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Đang mang thai hoặc cho con bú</span>
            </label>
          </div>

          {/* METABOLIC HEALTH & DIETARY PREFERENCES SECTION */}
          <div className="rounded-3xl border border-teal-200/80 bg-gradient-to-br from-teal-50/50 via-white to-emerald-50/30 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-100 pb-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-2xl bg-teal-600 text-white shadow-sm mt-0.5">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-stone-900">
                      Định hướng Sức khỏe Chuyển hóa & Đường/GI
                    </h3>
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                      Tùy chỉnh cá nhân hóa
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                    Hỗ trợ kiểm soát Gan nhiễm mỡ (MASLD), Kháng Insulin, Đường bổ sung và Nhịp ăn uống. Không thay thế phác đồ y khoa.
                  </p>
                </div>
              </div>

              {/* Master Switch Toggle */}
              <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto shrink-0">
                <span className="text-xs font-semibold text-stone-700">
                  {metabolicPrefs.metabolicMonitoringEnabled ? "Đang bật" : "Đã tắt"}
                </span>
                <input
                  type="checkbox"
                  checked={metabolicPrefs.metabolicMonitoringEnabled}
                  onChange={(e) =>
                    setMetabolicPrefs((prev) => ({
                      ...prev,
                      metabolicMonitoringEnabled: e.target.checked,
                    }))
                  }
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
              </label>
            </div>

            {metabolicPrefs.metabolicMonitoringEnabled && (
              <div className="space-y-4 pt-1">
                {/* 1. Strictness Mode Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-teal-600" />
                    <span>Mức độ cảnh báo (Strictness Mode):</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        id: "gentle" as StrictnessLevel,
                        label: "🍃 Nhẹ nhàng",
                        desc: "Chỉ cảnh báo khi tổng đường vượt mục tiêu hoặc GL bữa ăn quá cao.",
                      },
                      {
                        id: "balanced" as StrictnessLevel,
                        label: "⚖️ Cân bằng (Khuyên dùng)",
                        desc: "Nhắc nhở cân đối trước khi lưu, kèm gợi ý thực phẩm thay thế lành mạnh.",
                      },
                      {
                        id: "strict" as StrictnessLevel,
                        label: "🎯 Nghiêm ngặt",
                        desc: "Theo dõi sát sao mọi món có đường bổ sung và khoảng cách bữa ăn.",
                      },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() =>
                          setMetabolicPrefs((prev) => ({
                            ...prev,
                            strictness: mode.id,
                          }))
                        }
                        className={`rounded-2xl p-2.5 text-left border transition ${
                          metabolicPrefs.strictness === mode.id
                            ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                        }`}
                      >
                        <p className="text-xs font-bold">{mode.label}</p>
                        <p
                          className={`text-[10px] mt-1 line-clamp-2 ${
                            metabolicPrefs.strictness === mode.id ? "text-teal-100" : "text-stone-500"
                          }`}
                        >
                          {mode.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Specific Metabolic Considerations */}
                <div className="space-y-2 pt-1 border-t border-teal-100/70">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <HeartPulse className="h-3.5 w-3.5 text-teal-600" />
                    <span>Định hướng sức khỏe cần ưu tiên:</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-stone-200 cursor-pointer hover:border-teal-300 transition">
                      <input
                        type="checkbox"
                        checked={metabolicPrefs.fattyLiverConsideration}
                        onChange={(e) =>
                          setMetabolicPrefs((prev) => ({
                            ...prev,
                            fattyLiverConsideration: e.target.checked,
                          }))
                        }
                        className="rounded text-teal-600 focus:ring-teal-500 mt-0.5"
                      />
                      <div>
                        <span className="text-xs font-bold text-stone-900 block">
                          Gan nhiễm mỡ (MASLD)
                        </span>
                        <span className="text-[10px] text-stone-500 block leading-tight mt-0.5">
                          Tập trung hạn chế đường bổ sung, siro bắp HFCS và fructose tự do dạng lỏng.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-stone-200 cursor-pointer hover:border-teal-300 transition">
                      <input
                        type="checkbox"
                        checked={metabolicPrefs.highInsulinConsideration}
                        onChange={(e) =>
                          setMetabolicPrefs((prev) => ({
                            ...prev,
                            highInsulinConsideration: e.target.checked,
                          }))
                        }
                        className="rounded text-teal-600 focus:ring-teal-500 mt-0.5"
                      />
                      <div>
                        <span className="text-xs font-bold text-stone-900 block">
                          Kháng Insulin / Insulin cao
                        </span>
                        <span className="text-[10px] text-stone-500 block leading-tight mt-0.5">
                          Tập trung kiểm soát tinh bột hấp thu nhanh (GI cao) và tải lượng đường huyết (GL).
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 3. Added Sugar Target */}
                <div className="rounded-2xl bg-white p-3 border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-900">
                      <input
                        type="checkbox"
                        checked={metabolicPrefs.addedSugarMonitoringEnabled}
                        onChange={(e) =>
                          setMetabolicPrefs((prev) => ({
                            ...prev,
                            addedSugarMonitoringEnabled: e.target.checked,
                          }))
                        }
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <Candy className="h-4 w-4 text-rose-500" />
                      <span>Kiểm soát Đường bổ sung (Added Sugar)</span>
                    </label>
                    <span className="text-[11px] text-stone-500">
                      Khuyến nghị WHO: &lt; 25g/ngày
                    </span>
                  </div>

                  {metabolicPrefs.addedSugarMonitoringEnabled && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-stone-100">
                      <span className="text-xs text-stone-600">
                        Mục tiêu đường bổ sung tối đa trong ngày:
                      </span>
                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={metabolicPrefs.dailyAddedSugarTargetG ?? 25}
                          onChange={(e) =>
                            setMetabolicPrefs((prev) => ({
                              ...prev,
                              dailyAddedSugarTargetG: e.target.value === "" ? undefined : Number(e.target.value),
                            }))
                          }
                          className="w-20 rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-900 focus:border-teal-500 focus:outline-none"
                        />
                        <span className="text-xs text-stone-500 font-semibold">g / ngày</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Glycemic Index & Morning High-GI */}
                <div className="rounded-2xl bg-white p-3 border border-stone-200 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-900">
                    <input
                      type="checkbox"
                      checked={metabolicPrefs.giMonitoringEnabled}
                      onChange={(e) =>
                        setMetabolicPrefs((prev) => ({
                          ...prev,
                          giMonitoringEnabled: e.target.checked,
                        }))
                      }
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>Giám sát Chỉ số đường huyết (GI) & Tải lượng (GL)</span>
                  </label>

                  {metabolicPrefs.giMonitoringEnabled && (
                    <div className="pl-6 pt-1 space-y-2">
                      <label className="flex items-start gap-2 cursor-pointer text-xs text-stone-700">
                        <input
                          type="checkbox"
                          checked={metabolicPrefs.morningHighGiWarningEnabled}
                          onChange={(e) =>
                            setMetabolicPrefs((prev) => ({
                              ...prev,
                              morningHighGiWarningEnabled: e.target.checked,
                            }))
                          }
                          className="rounded text-teal-600 focus:ring-teal-500 mt-0.5"
                        />
                        <div>
                          <span className="font-semibold block text-stone-900">
                            Cảnh báo món GI cao trong khung giờ sáng sớm (05:00 - 09:30)
                          </span>
                          <span className="text-[10px] text-stone-500 block leading-tight mt-0.5">
                            Sau khi nhịn qua đêm, tinh bột tinh chế đơn lẻ có thể làm đường huyết tăng vọt rồi tụt nhanh. Hệ thống sẽ gợi ý bổ sung đạm/chất xơ để ổn định năng lượng.
                          </span>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                {/* 5. Meal Spacing & Snacking */}
                <div className="rounded-2xl bg-white p-3 border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-900">
                      <input
                        type="checkbox"
                        checked={metabolicPrefs.mealTimingMonitoringEnabled}
                        onChange={(e) =>
                          setMetabolicPrefs((prev) => ({
                            ...prev,
                            mealTimingMonitoringEnabled: e.target.checked,
                          }))
                        }
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <Timer className="h-4 w-4 text-teal-600" />
                      <span>Giám sát Khoảng cách giữa các bữa ăn</span>
                    </label>
                  </div>

                  {metabolicPrefs.mealTimingMonitoringEnabled && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-stone-100">
                      <span className="text-xs text-stone-600">
                        Khoảng cách tối thiểu giữa 2 lần ăn (tránh ăn vặt liên tục):
                      </span>
                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <input
                          type="number"
                          min="60"
                          max="360"
                          step="15"
                          value={metabolicPrefs.minimumMealIntervalMinutes}
                          onChange={(e) =>
                            setMetabolicPrefs((prev) => ({
                              ...prev,
                              minimumMealIntervalMinutes: Math.max(30, Number(e.target.value)),
                            }))
                          }
                          className="w-20 rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-900 focus:border-teal-500 focus:outline-none"
                        />
                        <span className="text-xs text-stone-500 font-semibold">phút (~{round((metabolicPrefs.minimumMealIntervalMinutes || 180) / 60, 1)}h)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Custom Dietary Notes */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-800">
                    Ghi chú dinh dưỡng cá nhân (Tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={metabolicPrefs.customDietaryNotes || ""}
                    onChange={(e) =>
                      setMetabolicPrefs((prev) => ({
                        ...prev,
                        customDietaryNotes: e.target.value,
                      }))
                    }
                    placeholder="Ví dụ: Bác sĩ yêu cầu kiêng đường tinh luyện, giảm tinh bột trắng..."
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 placeholder:text-stone-400 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Target Calculation Preview Column */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-600" />
              <h3 className="text-base font-bold text-stone-900">Mục tiêu được tính toán</h3>
            </div>

            {calculated.warnings.length > 0 && (
              <div className="rounded-2xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 space-y-1">
                {calculated.warnings.map((w, idx) => (
                  <p key={idx}>{w}</p>
                ))}
              </div>
            )}

            <div className="space-y-3 divide-y divide-emerald-100">
              <div className="pt-2 flex justify-between text-xs">
                <span className="text-stone-600">Chỉ số BMI:</span>
                <span className="font-bold text-stone-900">
                  {calculated.bmi} ({calculated.bmiCategory})
                </span>
              </div>
              <div className="pt-2 flex justify-between text-xs">
                <span className="text-stone-600">Chuyển hóa cơ bản (BMR):</span>
                <span className="font-bold text-stone-900">{calculated.bmr} kcal</span>
              </div>
              <div className="pt-2 flex justify-between text-xs">
                <span className="text-stone-600">Tổng tiêu thụ hàng ngày (TDEE):</span>
                <span className="font-bold text-stone-900">{calculated.tdee} kcal</span>
              </div>
              <div className="pt-2 flex justify-between text-sm">
                <span className="font-bold text-emerald-900">Mục tiêu nạp mỗi ngày:</span>
                <div className="text-right">
                  <span
                    className={`font-black text-lg ${
                      calculated.isBelowSafetyFloor ? "text-rose-700" : "text-emerald-700"
                    }`}
                  >
                    {calculated.calorieTarget} kcal
                  </span>
                  {calculated.isBelowSafetyFloor && (
                    <span className="block text-[10px] text-rose-600 font-semibold">
                      (Khi lưu sẽ giữ sàn an toàn {calculated.safeCalorieTarget} kcal)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Target Timeline Highlight Card */}
            {weightToLose > 0 && (
              <div className="rounded-2xl bg-white p-4 border border-emerald-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    <span>Lộ trình dự kiến về đích</span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      calculated.timeline.safetyStatus === "dangerous_low_calorie"
                        ? "bg-rose-100 text-rose-800"
                        : calculated.timeline.safetyStatus === "aggressive_warning"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {calculated.timeline.safetyStatus === "dangerous_low_calorie"
                      ? "Cần giãn thời gian"
                      : calculated.timeline.safetyStatus === "aggressive_warning"
                      ? "Tốc độ nhanh"
                      : "Chuẩn an toàn"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-stone-50 p-2.5 border border-stone-100">
                    <span className="text-[10px] text-stone-500 block">Cần giảm:</span>
                    <span className="text-base font-black text-stone-900">
                      {calculated.timeline.weightToLoseKg} kg
                    </span>
                  </div>
                  <div className="rounded-xl bg-emerald-50/70 p-2.5 border border-emerald-100">
                    <span className="text-[10px] text-emerald-800 block">Thời gian:</span>
                    <span className="text-base font-black text-emerald-800">
                      {calculated.timeline.targetWeeks} tuần
                    </span>
                    <span className="text-[10px] text-emerald-600 block">
                      (~{calculated.timeline.targetMonths} tháng)
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-stone-50/80 p-2.5 border border-stone-100 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Ngày về đích:</span>
                    <span className="font-bold text-emerald-800">
                      {calculated.timeline.formattedCompletionDate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Tốc độ giảm:</span>
                    <span className="font-semibold text-stone-800">
                      ~{calculated.timeline.weeklyWeightChangeKg} kg/tuần
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Thâm hụt mỗi ngày:</span>
                    <span className="font-semibold text-stone-800">
                      {calculated.deficitKcal} kcal ({calculated.deficitPercent}%)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Target Macros Breakdown */}
            <div className="rounded-2xl bg-white p-4 border border-emerald-100 space-y-2">
              <p className="text-xs font-bold text-stone-800">Khẩu phần đa lượng (Macros)</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-stone-500">Đạm (Protein):</span>
                  <p className="font-bold text-emerald-600">{calculated.macros.protein}g</p>
                </div>
                <div>
                  <span className="text-stone-500">Chất béo (Fat):</span>
                  <p className="font-bold text-rose-600">{calculated.macros.fat}g</p>
                </div>
                <div>
                  <span className="text-stone-500">Tinh bột (Carb):</span>
                  <p className="font-bold text-amber-600">{calculated.macros.carbs}g</p>
                </div>
                <div>
                  <span className="text-stone-500">Chất xơ (Fiber):</span>
                  <p className="font-bold text-teal-600">{calculated.macros.fiber}g</p>
                </div>
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-stone-600 italic">
              {calculated.explanation}
            </p>

            {savedSuccess && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <span>Đã lưu thành công vào hồ sơ!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Đang lưu..." : "Lưu hồ sơ & Cập nhật mục tiêu"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

