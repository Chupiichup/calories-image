"use client";

import React, { useState } from "react";
import {
  Scale,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Minus,
  Calendar,
  AlertCircle,
} from "lucide-react";
import type { StoredWeightEntry, StoredGoal } from "@/lib/db/repository";
import { calculateWeightTrend, round } from "@/lib/nutrition";

interface WeightTabProps {
  entries: StoredWeightEntry[];
  goal: StoredGoal;
  onAddEntry: (entry: { weightKg: number; recordedAt: string; notes?: string }) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
}

export function WeightTab({
  entries,
  goal,
  onAddEntry,
  onDeleteEntry,
}: WeightTabProps) {
  const [newWeight, setNewWeight] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [recordDate, setRecordDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setRecordDate(new Date().toISOString().split("T")[0]);
  }, []);

  const trend =
    entries.length > 0
      ? calculateWeightTrend(entries)
      : {
          latest: goal.currentWeightKg,
          previous: null,
          changeKg: 0,
          avgWeightKg: goal.currentWeightKg,
          direction: "flat" as const,
          weeklyRateKg: 0,
        };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(newWeight);
    if (isNaN(w) || w <= 30 || w >= 250) {
      setError("Vui lòng nhập cân nặng hợp lệ (30kg - 250kg).");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onAddEntry({
        weightKg: round(w, 1),
        recordedAt: `${recordDate}T07:00:00.000Z`,
        notes: newNotes.trim() || undefined,
      });
      setNewWeight("");
      setNewNotes("");
    } catch (err: any) {
      setError(err.message || "Không thể lưu chỉ số cân nặng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prepare chart coordinates (SVG line chart)
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );

  const minWeight = Math.min(...sortedEntries.map((e) => e.weightKg), goal.goalWeightKg) - 1;
  const maxWeight = Math.max(...sortedEntries.map((e) => e.weightKg), goal.currentWeightKg) + 1;
  const weightRange = maxWeight - minWeight || 1;

  const points = sortedEntries.map((e, idx) => {
    const x = sortedEntries.length > 1 ? (idx / (sortedEntries.length - 1)) * 100 : 50;
    const y = 100 - ((e.weightKg - minWeight) / weightRange) * 100;
    return { x, y, ...e };
  });

  const svgPolyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="space-y-6">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Weight Card */}
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Cân nặng hiện tại</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-black text-stone-900">{trend.latest}</span>
            <span className="text-sm font-medium text-stone-500">kg</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {trend.direction === "down" && (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                <TrendingDown className="h-3.5 w-3.5" />
                Giảm {Math.abs(trend.changeKg)} kg so với lần đo trước
              </span>
            )}
            {trend.direction === "up" && (
              <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                <TrendingUp className="h-3.5 w-3.5" />
                Tăng {trend.changeKg} kg
              </span>
            )}
            {trend.direction === "flat" && (
              <span className="inline-flex items-center gap-1 font-semibold text-stone-500">
                <Minus className="h-3.5 w-3.5" />
                Duy trì ổn định
              </span>
            )}
          </div>
        </div>

        {/* Goal Weight Progress */}
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Mục tiêu giảm mỡ</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-black text-emerald-600">{goal.goalWeightKg}</span>
            <span className="text-sm font-medium text-stone-500">kg</span>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            Còn lại: <strong>{round(Math.abs(trend.latest - goal.goalWeightKg), 1)} kg</strong> để đạt mục tiêu vóc dáng.
          </p>
          {goal.targetWeeks && (
            <p className="mt-1.5 text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-emerald-600" />
              <span>Dự kiến: ~{goal.targetWeeks} tuần {goal.targetDate ? `(${goal.targetDate})` : ""}</span>
            </p>
          )}
        </div>

        {/* Weekly Trend Rate */}
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Tốc độ thay đổi trung bình</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-black text-stone-900">
              {trend.weeklyRateKg > 0 ? `+${trend.weeklyRateKg}` : trend.weeklyRateKg}
            </span>
            <span className="text-sm font-medium text-stone-500">kg/tuần</span>
          </div>
          <p className="mt-2 text-xs text-emerald-700 font-medium">
            Tốc độ an toàn bảo toàn cơ bắp: 0.3 - 0.7 kg/tuần
          </p>
        </div>
      </div>

      {/* Weight Trend Chart */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-900">Biểu đồ tiến trình cân nặng</h3>
            <p className="text-xs text-stone-500">Theo dõi đường xu hướng dài hạn thay vì biến động nước từng ngày</p>
          </div>
        </div>

        {sortedEntries.length < 2 ? (
          <p className="text-xs text-stone-400 italic text-center py-10">
            Cần ít nhất 2 bản ghi cân nặng để vẽ biểu đồ xu hướng.
          </p>
        ) : (
          <div className="relative h-48 w-full pt-4">
            <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Horizontal Reference Grid lines */}
              <line x1="0" y1="20" x2="100" y2="20" stroke="#f1f5f9" strokeWidth="0.8" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#f1f5f9" strokeWidth="0.8" />
              <line x1="0" y1="80" x2="100" y2="80" stroke="#f1f5f9" strokeWidth="0.8" />

              {/* Polyline Path */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={svgPolyline}
              />

              {/* Individual Data Points */}
              {points.map((p) => (
                <circle
                  key={p.id}
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  className="fill-white stroke-emerald-600 stroke-[2]"
                />
              ))}
            </svg>

            {/* X-axis labels */}
            <div className="mt-3 flex justify-between text-[11px] text-stone-400">
              <span>{new Date(sortedEntries[0].recordedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</span>
              <span>
                {new Date(sortedEntries[sortedEntries.length - 1].recordedAt).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Add Weight Form & History Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form to log weight */}
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-stone-900">Ghi nhận cân nặng mới</h3>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-stone-600">Cân nặng (kg):</label>
              <input
                type="number"
                step="0.1"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="VD: 76.2"
                required
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold text-stone-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-600">Ngày ghi nhận:</label>
              <input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-600">Ghi chú (tùy chọn):</label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="VD: Đo sáng sớm lúc đói, sau khi đi vệ sinh"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{isSubmitting ? "Đang lưu..." : "Lưu chỉ số cân nặng"}</span>
            </button>
          </form>
        </div>

        {/* Weight Log History */}
        <div className="lg:col-span-2 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm space-y-3">
          <h3 className="text-base font-bold text-stone-900">Lịch sử cân nặng ({entries.length} lần đo)</h3>

          <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
            {sortedEntries.reverse().map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2.5 text-xs">
                <div>
                  <span className="font-bold text-stone-900 text-sm">{entry.weightKg} kg</span>
                  <div className="flex items-center gap-2 text-stone-500 text-[11px]">
                    <span>
                      {new Date(entry.recordedAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                    {entry.notes && <span>• {entry.notes}</span>}
                  </div>
                </div>

                <button
                  onClick={() => onDeleteEntry(entry.id)}
                  className="rounded-lg p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Xóa bản ghi này"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
