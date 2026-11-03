"use client";

import React, { useState, useEffect } from "react";
import {
  Footprints,
  Flame,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  X,
} from "lucide-react";
import {
  repository,
  type StoredDailyActivity,
  getLocalDateString,
} from "@/lib/db/repository";
import { round } from "@/lib/nutrition";

interface DailyActivityCardProps {
  selectedDate?: string;
  onRefresh?: () => Promise<void>;
}

export function DailyActivityCard({ selectedDate, onRefresh }: DailyActivityCardProps) {
  const targetDate = selectedDate || getLocalDateString();
  const [activity, setActivity] = useState<StoredDailyActivity | null>(null);
  const [recentActivities, setRecentActivities] = useState<StoredDailyActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Load activity for date
  const loadActivityData = async () => {
    setIsLoading(true);
    try {
      const [todayAct, recents] = await Promise.all([
        repository.getActivityForDate(targetDate),
        repository.getRecentActivities(7),
      ]);
      setActivity(todayAct);
      setRecentActivities(recents);
    } catch (err) {
      console.error("Load daily activity error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActivityData();
  }, [targetDate]);

  const handleManualRefresh = async () => {
    await loadActivityData();
    if (onRefresh) {
      await onRefresh();
    }
  };

  // Format last synced timestamp
  const formatSyncedTime = (isoString?: string) => {
    if (!isoString) return "Chưa đồng bộ";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
    } catch {
      return "Không xác định";
    }
  };

  const isConnected = !!activity && !!activity.syncedAt;
  const isToday = targetDate === getLocalDateString();

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
            <Footprints className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-stone-900">
                Hoạt động trong ngày (Daily Activity)
              </h3>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                Samsung Health / Health Connect
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Dữ liệu bước chân và calo hoạt động thực tế từ smartphone Samsung
            </p>
          </div>
        </div>

        {/* Status Pill & Action Buttons */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Đã đồng bộ</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600 border border-stone-200">
              <AlertCircle className="h-3.5 w-3.5 text-stone-400" />
              <span>Chưa kết nối</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition active:scale-95 disabled:opacity-50"
            title="Làm mới dữ liệu hoạt động"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowInstructions(true)}
            className="flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Kết nối App</span>
          </button>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Steps */}
        <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold">Bước chân hôm nay</span>
            <Footprints className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5 pt-1">
            <span className="text-2xl font-black text-stone-900 tracking-tight">
              {activity ? activity.steps.toLocaleString("vi-VN") : "0"}
            </span>
            <span className="text-xs font-medium text-stone-500">bước</span>
          </div>
          <p className="text-[10px] text-stone-400">
            {activity && activity.steps >= 10000
              ? "🎉 Tuyệt vời! Đã đạt mốc 10,000 bước"
              : activity && activity.steps > 0
              ? `Còn ${Math.max(0, 10000 - activity.steps).toLocaleString("vi-VN")} bước để đạt 10k`
              : "Chưa ghi nhận bước chân"}
          </p>
        </div>

        {/* Metric 2: Active Calories Burned */}
        <div className="rounded-2xl border border-stone-200/80 bg-amber-50/40 p-4 space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold">Calo tiêu hao vận động</span>
            <Flame className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1.5 pt-1">
            {activity && activity.activeCaloriesKcal !== null ? (
              <>
                <span className="text-2xl font-black text-amber-800 tracking-tight">
                  {round(activity.activeCaloriesKcal, 0)}
                </span>
                <span className="text-xs font-medium text-amber-600">kcal</span>
              </>
            ) : (
              <span className="text-sm font-bold text-stone-400 italic">
                Chưa có dữ liệu
              </span>
            )}
          </div>
          <p className="text-[10px] text-stone-400">
            Active Calories (không bao gồm năng lượng cơ bản BMR)
          </p>
        </div>

        {/* Metric 3: Data Source */}
        <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold">Nguồn dữ liệu</span>
            <Smartphone className="h-4 w-4 text-stone-400" />
          </div>
          <div className="pt-1">
            <span className="text-sm font-bold text-stone-800 block truncate">
              {activity?.source === "samsung_health"
                ? "Samsung Health"
                : activity?.source || "Android Health Connect"}
            </span>
          </div>
          <p className="text-[10px] text-stone-400">
            AndroidX Health Connect SDK
          </p>
        </div>

        {/* Metric 4: Last Sync Time */}
        <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold">Thời điểm đồng bộ</span>
            <RefreshCw className="h-4 w-4 text-stone-400" />
          </div>
          <div className="pt-1">
            <span className="text-sm font-bold text-stone-800 block truncate">
              {formatSyncedTime(activity?.syncedAt)}
            </span>
          </div>
          <p className="text-[10px] text-stone-400">
            Múi giờ: {activity?.timezone || "Asia/Ho_Chi_Minh"}
          </p>
        </div>
      </div>

      {/* Safety Guardrail Note */}
      <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200/80 flex items-start justify-between gap-3 text-xs text-stone-600">
        <p className="leading-relaxed">
          <strong className="text-stone-800 font-semibold">Lưu ý khoa học:</strong> Calo tiêu hao vận động từ Samsung Health được hiển thị nhằm theo dõi mức độ năng động hàng ngày. Hệ thống <strong>không cộng dồn</strong> calo này vào ngân sách ăn uống để đảm bảo mức thâm hụt calo (Calorie Deficit) giảm cân của bạn luôn ổn định và an toàn.
        </p>
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="shrink-0 flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 hover:underline text-xs"
        >
          <span>Lịch sử 7 ngày</span>
          {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* History 7-Day Drawer / Accordion */}
      {showHistory && (
        <div className="pt-2 border-t border-stone-200 space-y-2">
          <h4 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-emerald-600" />
            <span>Lịch sử hoạt động thể chất gần nhất:</span>
          </h4>

          {recentActivities.length === 0 ? (
            <p className="text-xs text-stone-400 italic py-3 text-center">
              Chưa có dữ liệu lịch sử hoạt động. Kết nối ứng dụng Android Companion để đồng bộ hàng ngày.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {recentActivities.map((rec) => {
                const isSelected = rec.activityDate === targetDate;
                return (
                  <div
                    key={rec.id || rec.activityDate}
                    className={`rounded-2xl p-3 border text-xs space-y-1 transition ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/50 shadow-xs"
                        : "border-stone-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between text-stone-500 text-[11px] font-semibold">
                      <span>{rec.activityDate}</span>
                      <span className="rounded bg-stone-100 px-1 py-0.5 text-[9px] text-stone-600 font-bold uppercase">
                        {rec.source}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-base font-black text-stone-900">
                        {rec.steps.toLocaleString("vi-VN")}
                      </span>
                      <span className="text-[11px] text-stone-500">bước</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-100 text-amber-700">
                      <span>Tiêu hao:</span>
                      <strong className="font-bold">
                        {rec.activeCaloriesKcal !== null ? `${round(rec.activeCaloriesKcal, 0)} kcal` : "N/A"}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Connection Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-stone-900">
                  Kết nối Samsung Health qua Android Health Connect
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-stone-600 leading-relaxed">
              <p>
                Trình duyệt web di động (Chrome, Samsung Internet) vì lý do bảo mật của Google không thể đọc trực tiếp cảm biến Health Connect. Để đồng bộ bước chân & calo tự động, bạn chỉ cần mở ứng dụng Android Companion đi kèm:
              </p>

              <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200/80 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                    1
                  </span>
                  <div>
                    <strong className="text-stone-900 block font-semibold">Cài đặt Health Connect & Samsung Health:</strong>
                    <span>Đảm bảo trên điện thoại Samsung của bạn đã cài đặt ứng dụng Samsung Health và kích hoạt đồng bộ với Android Health Connect (Cài đặt &rarr; Ứng dụng &rarr; Health Connect).</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                    2
                  </span>
                  <div>
                    <strong className="text-stone-900 block font-semibold">Cấp quyền truy cập trong ứng dụng:</strong>
                    <span>Mở ứng dụng <strong>Calories Image Companion</strong> trên Android, bấm <em>"Cấp quyền Health Connect"</em> cho 2 chỉ số: <strong>Bước chân (Steps)</strong> và <strong>Calo hoạt động (Active Calories)</strong>.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                    3
                  </span>
                  <div>
                    <strong className="text-stone-900 block font-semibold">Bấm "Đồng bộ ngay":</strong>
                    <span>Dữ liệu sẽ được gửi thẳng lên hệ thống máy chủ và hiển thị ngay lập tức trên dashboard web của bạn.</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50/70 p-3 border border-emerald-200 text-emerald-900">
                <p className="font-semibold">Mã nguồn Android Companion:</p>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Mã nguồn Android được lưu tại thư mục <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[10px]">android-companion/</code> trong repository dự án của bạn (sử dụng Kotlin, Jetpack Compose và AndroidX Health Connect SDK chuẩn của Google).
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 transition"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

