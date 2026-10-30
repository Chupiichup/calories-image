"use client";

import React, { useState } from "react";
import {
  X,
  Mail,
  Lock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  LogIn,
  UserPlus,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDemoMode: boolean;
  onToggleDemoMode: (enable: boolean) => void;
}

export function AuthModal({
  isOpen,
  onClose,
  isDemoMode,
  onToggleDemoMode,
}: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const supabase = createClient();

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError(
        "Chưa phát hiện cấu hình Supabase URL và Anon Key trong tệp .env.local. Bạn vẫn có thể trải nghiệm đầy đủ các tính năng trong Chế độ Demo lưu trữ cục bộ.",
      );
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setMessage("Đăng ký thành công! Vui lòng kiểm tra email của bạn để xác thực tài khoản.");
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        setMessage("Đăng nhập thành công! Đang tải lại dữ liệu tài khoản...");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi xác thực tài khoản.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-stone-900">
              {isSignUp ? "Tạo tài khoản cá nhân" : "Đăng nhập Supabase"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-2xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-stone-700">Email:</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten-ban@example.com"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-xs font-medium text-stone-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700">Mật khẩu:</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-xs font-medium text-stone-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {isSignUp ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            <span>{loading ? "Đang xử lý..." : isSignUp ? "Đăng ký tài khoản" : "Đăng nhập"}</span>
          </button>
        </form>

        <div className="flex items-center justify-between text-xs pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-semibold text-emerald-600 hover:text-emerald-700"
          >
            {isSignUp ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký ngay"}
          </button>

          {supabase && (
            <button
              type="button"
              onClick={handleSignOut}
              className="text-stone-500 hover:text-rose-600 transition flex items-center gap-1"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Đăng xuất</span>
            </button>
          )}
        </div>

        {/* Demo Mode Notice */}
        <div className="rounded-2xl bg-stone-100 p-3 text-[11px] text-stone-600">
          <p className="font-semibold text-stone-800">Chế độ Demo / Offline:</p>
          <p className="mt-0.5">
            Nếu bạn đang kiểm thử trên máy cục bộ chưa kết nối Supabase, ứng dụng tự động lưu trữ và tính toán chính xác trên trình duyệt.
          </p>
        </div>
      </div>
    </div>
  );
}

