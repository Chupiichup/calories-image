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
} from "lucide-react";
import type { StoredProfile, StoredGoal } from "@/lib/db/repository";
import {
  calculateComprehensiveTargets,
  ACTIVITY_MULTIPLIER,
  round,
  type BiologicalSex,
  type ActivityLevel,
  type WeightLossPace,
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

  const [isSpecialPregnant, setIsSpecialPregnant] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Compute live deterministic preview of targets
  const calculated = calculateComprehensiveTargets(
    {
      weightKg: typeof currentWeight === "number" && currentWeight > 0 ? currentWeight : 70,
      heightCm: typeof height === "number" && height > 0 ? height : 170,
      ageYears: typeof age === "number" && age > 0 ? age : 25,
      sex,
      activityLevel: activity,
      isPregnantOrNursing: isSpecialPregnant,
      isUnder18: typeof age === "number" && age < 18,
    },
    pace,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (age === "" || height === "" || currentWeight === "" || goalWeight === "") {
      return;
    }
    setIsSaving(true);
    setSavedSuccess(false);

    try {
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
          dailyCalorieTarget: calculated.calorieTarget,
          dailyProteinTargetG: calculated.macros.protein,
          dailyCarbTargetG: calculated.macros.carbs,
          dailyFatTargetG: calculated.macros.fat,
          dailyFiberTargetG: calculated.macros.fiber,
          weightLossPace: pace,
        },
      );
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

          {/* Weight loss pace */}
          <div>
            <label className="text-xs font-semibold text-stone-700">Tốc độ thâm hụt giảm mỡ:</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                { id: "slow", label: "Chậm (15%)", desc: "Giữ cơ tối đa" },
                { id: "moderate", label: "Vừa phải (20%)", desc: "Khuyên dùng chuẩn" },
                { id: "aggressive", label: "Nhanh (25%)", desc: "Thâm hụt tối đa" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPace(p.id as WeightLossPace)}
                  className={`rounded-2xl p-2.5 text-center transition ${
                    pace === p.id
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  <p className="text-xs font-bold">{p.label}</p>
                  <p className={`text-[10px] ${pace === p.id ? "text-emerald-100" : "text-stone-500"}`}>
                    {p.desc}
                  </p>
                </button>
              ))}
            </div>
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
                <span className="font-black text-emerald-700 text-lg">
                  {calculated.calorieTarget} kcal
                </span>
              </div>
            </div>

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

