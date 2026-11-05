"use client";

import React, { useState, useEffect } from "react";
import {
  Footprints,
  Flame,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  X,
  Download,
  KeyRound,
  Copy,
  Check,
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

  // Pairing code state
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Load activity for date
  const loadActivityData = async () => {
    setIsLoading(true);
    try {
      let [todayAct, recents] = await Promise.all([
        repository.getActivityForDate(targetDate),
        repository.getRecentActivities(7),
      ]);

      // If not in local storage / repository, query API directly
      if (!todayAct) {
        try {
          const res = await fetch(`/api/activity?date=${targetDate}`);
          if (res.ok) {
            const data = await res.json();
            if (data.activity) {
              todayAct = data.activity;
              await repository.saveActivity(data.activity);
            }
          }
        } catch {
          // ignore network error
        }
      }

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

  // Fetch 6-digit pairing code
  const fetchPairingCode = async () => {
    setPairingLoading(true);
    try {
      const res = await fetch("/api/activity/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.code) {
          setPairingCode(data.code);
        }
      }
    } catch (err) {
      console.error("Fetch pairing code error:", err);
    } finally {
      setPairingLoading(false);
    }
  };

  const handleOpenInstructions = () => {
    setShowInstructions(true);
    fetchPairingCode();
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
            onClick={handleOpenInstructions}
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
                  Kết nối Samsung Health qua Android Companion
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
              {/* 6-Digit Pairing Code Banner */}
              <div className="rounded-2xl bg-emerald-50/90 p-4 border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <KeyRound className="h-4 w-4 text-emerald-700" />
                    Mã kết nối nhanh với điện thoại (6 số):
                  </span>
                  <button
                    onClick={fetchPairingCode}
                    disabled={pairingLoading}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${pairingLoading ? "animate-spin" : ""}`} />
                    <span>Lấy mã mới</span>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-3 py-2.5 bg-white rounded-xl border border-emerald-200 shadow-xs">
                  <span className="text-2xl font-black tracking-widest text-emerald-800 font-mono">
                    {pairingLoading
                      ? "Đang tạo mã..."
                      : pairingCode
                      ? `${pairingCode.slice(0, 3)} ${pairingCode.slice(3)}`
                      : "Nhấn 'Lấy mã mới'"}
                  </span>
                  {pairingCode && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(pairingCode);
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 2000);
                      }}
                      className="rounded-lg bg-emerald-100 p-1.5 text-emerald-800 hover:bg-emerald-200 transition"
                      title="Sao chép mã"
                    >
                      {codeCopied ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-emerald-800 text-center font-medium">
                  Mở app <strong>Calories Image Companion</strong> trên điện thoại &rarr; chọn <strong>"Nhập mã kết nối (6 số)"</strong> &rarr; điền mã trên để liên kết tự động trong 15 phút.
                </p>
              </div>

              {/* Step by step guide */}
              <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200/80 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                    1
                  </span>
                  <div>
                    <strong className="text-stone-900 block font-semibold">Cài đặt Health Connect & Samsung Health:</strong>
                    <span>Đảm bảo trên điện thoại Samsung đã kích hoạt đồng bộ dữ liệu với Android Health Connect (trong Cài đặt Samsung Health).</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                    2
                  </span>
                  <div>
                    <strong className="text-stone-900 block font-semibold">Cấp quyền và liên kết tài khoản:</strong>
                    <span>Trong app Companion, cấp quyền Health Connect cho <strong>Bước chân</strong> & <strong>Calo hoạt động</strong>, sau đó nhập mã kết nối 6 số hoặc đăng nhập email.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                    3
                  </span>
                  <div>
                    <strong className="text-stone-900 block font-semibold">Bấm "Đồng bộ lên Web ngay":</strong>
                    <span>Dữ liệu bước chân và calo vận động sẽ lập tức xuất hiện trên dashboard web của bạn.</span>
                  </div>
                </div>
              </div>

              {/* APK Download Button */}
              <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm">Cập nhật app APK mới nhất</h4>
                  <p className="text-[11px] text-emerald-100">Bản CaloriesImageCompanion.apk mới nhất hỗ trợ mã 6 số & Dark mode</p>
                </div>
                <a
                  href="/CaloriesImageCompanion.apk"
                  download="CaloriesImageCompanion.apk"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-emerald-950 shadow-sm hover:bg-emerald-50 transition active:scale-95 shrink-0"
                >
                  <Download className="h-4 w-4 text-emerald-700" />
                  <span>Tải file APK (.apk)</span>
                </a>
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
