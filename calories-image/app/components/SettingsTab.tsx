"use client";

import React, { useState } from "react";
import {
  Download,
  Upload,
  ShieldCheck,
  Cpu,
  Lock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Database,
} from "lucide-react";
import { repository } from "@/lib/db/repository";

export function SettingsTab() {
  const [exporting, setExporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<"success" | "error" | null>(null);

  const handleExportJson = async () => {
    setExporting(true);
    try {
      const dataStr = await repository.exportAllData();
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `calories-image-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCsv = async () => {
    const meals = await repository.getAllMeals();
    let csv = "ID,Ngay_An,Loai_Bua,Ten_Mon,Khoi_Luong_g,Calo,Dam_g,Carb_g,Chat_Beo_g,Chat_Xo_g,Nguon\n";
    meals.forEach((m) => {
      m.items.forEach((it) => {
        csv += `"${m.id}","${m.eatenAt}","${m.mealType}","${it.foodNameSnapshot}",${it.portionG},${it.calories},${it.protein},${it.carbs},${it.fat},${it.fiber},"${it.nutritionSource}"\n`;
      });
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calories-image-meals-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await repository.importData(content);
      setImportStatus(res.success ? "success" : "error");
      setImportMessage(res.message);
      if (res.success) {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Privacy & Security Guarantee */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">Bảo mật dữ liệu & Quyền riêng tư</h2>
            <p className="text-xs text-stone-500">Cam kết bảo mật cá nhân theo tiêu chuẩn khắt khe</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-stone-600">
          <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-stone-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Chính sách lưu ảnh bữa ăn</span>
            </div>
            <p className="leading-relaxed">
              Mặc định, ứng dụng <strong>không lưu trữ vĩnh viễn hình ảnh bữa ăn</strong> trên máy chủ. Hình ảnh chỉ được xử lý tạm thời trong bộ nhớ đệm RAM để phân tích món ăn và bị hủy ngay lập tức sau đó.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-stone-800">
              <Database className="h-4 w-4 text-emerald-600" />
              <span>Bảo vệ quyền truy cập RLS (Supabase)</span>
            </div>
            <p className="leading-relaxed">
              Mỗi người dùng sở hữu dữ liệu riêng biệt được bảo vệ bởi chính sách Row Level Security (RLS) của PostgreSQL. Không ai khác có thể truy cập nhật ký bữa ăn của bạn.
            </p>
          </div>
        </div>
      </div>

      {/* AI Provider Config Info */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">Mô hình AI & Nhà cung cấp thị giác</h2>
            <p className="text-xs text-stone-500">Kiến trúc AI Vision độc lập và có thể thay thế</p>
          </div>
        </div>

        <div className="text-xs leading-relaxed text-stone-600 space-y-2">
          <p>
            Hệ thống hỗ trợ cơ chế cắm ghép đa nhà cung cấp thông qua biến môi trường:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Google Gemini Vision (gemini-1.5-flash):</strong> Tốc độ cao, chi phí cực thấp hoặc miễn phí quota khởi đầu.
            </li>
            <li>
              <strong>OpenAI Vision (gpt-4o-mini):</strong> Phân tích định lượng chính xác cao, chi phí tối ưu.
            </li>
            <li>
              <strong>Mock Provider:</strong> Tự động kích hoạt khi chưa có API key để phục vụ kiểm thử và demo đầy đủ mà không tốn phí.
            </li>
          </ul>
        </div>
      </div>

      {/* Data Backup & Restore */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">Sao lưu & Khôi phục dữ liệu cá nhân</h2>
            <p className="text-xs text-stone-500">Xuất dữ liệu toàn diện để lưu trữ ngoại tuyến hoặc chuyển thiết bị</p>
          </div>
        </div>

        {importMessage && (
          <div
            className={`flex items-center gap-2 rounded-2xl p-3 text-xs border ${
              importStatus === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            {importStatus === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{importMessage}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleExportJson}
            disabled={exporting}
            className="flex items-center gap-2 rounded-2xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-stone-800 transition"
          >
            <Download className="h-4 w-4" />
            <span>Xuất toàn bộ dữ liệu (JSON)</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
          >
            <FileText className="h-4 w-4" />
            <span>Xuất nhật ký bữa ăn (CSV)</span>
          </button>

          <label className="flex items-center gap-2 cursor-pointer rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition">
            <Upload className="h-4 w-4" />
            <span>Khôi phục từ tệp JSON</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
}

