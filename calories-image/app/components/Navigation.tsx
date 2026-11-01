"use client";

import React from "react";
import {
  LayoutDashboard,
  Camera,
  BookOpen,
  History,
  Scale,
  User,
  Settings,
  ShieldCheck,
  LogIn,
  RefreshCw,
  Sparkles,
} from "lucide-react";

export type TabType =
  | "dashboard"
  | "log-meal"
  | "suggestions"
  | "diary"
  | "history"
  | "weight"
  | "profile"
  | "settings";

interface NavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isDemoMode: boolean;
  onOpenAuth: () => void;
  currentUser?: { id: string; email?: string } | null;
  onSync?: () => void;
  isSyncing?: boolean;
}

export function Navigation({
  currentTab,
  onSelectTab,
  isDemoMode,
  onOpenAuth,
  currentUser,
  onSync,
  isSyncing,
}: NavigationProps) {
  const navItems: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { id: "log-meal", label: "Ghi nhận bữa ăn", icon: Camera },
    { id: "suggestions", label: "Gợi ý món ăn", icon: Sparkles },
    { id: "diary", label: "Nhật ký thực phẩm", icon: BookOpen },
    { id: "history", label: "Lịch sử dinh dưỡng", icon: History },
    { id: "weight", label: "Cân nặng", icon: Scale },
    { id: "profile", label: "Hồ sơ & Mục tiêu", icon: User },
    { id: "settings", label: "Cài đặt & Dữ liệu", icon: Settings },
  ];

  return (
    <>
      {/* Top Header for Desktop & Tablet */}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-lime-500 text-white shadow-md shadow-emerald-600/20">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-stone-900 tracking-tight">Calories Image</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  AI Coach
                </span>
              </div>
              <p className="text-xs text-stone-500 hidden sm:block">Giảm mỡ & Bảo toàn cơ bắp</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Account / Mode Indicator */}
          <div className="flex items-center gap-2">
            {currentUser && onSync && (
              <button
                type="button"
                onClick={onSync}
                disabled={isSyncing}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 shadow-sm transition hover:border-emerald-300 hover:text-emerald-600 active:scale-95 disabled:opacity-60"
                title="Đồng bộ dữ liệu tức thì"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-emerald-600" : ""}`} />
              </button>
            )}

            {!currentUser ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50/80 px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 hover:border-emerald-500 active:scale-95"
              >
                <LogIn className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="hidden sm:inline">Đăng nhập / Đăng ký</span>
                <span className="sm:hidden">Đăng nhập</span>
                {isDemoMode && (
                  <span
                    className="h-2 w-2 rounded-full bg-amber-500 animate-pulse ml-0.5"
                    title="Chế độ Demo cục bộ"
                  />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectTab("profile")}
                className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white pl-1.5 pr-3 py-1 text-xs font-medium text-stone-800 transition hover:bg-emerald-50/80 hover:border-emerald-400 active:scale-95 shadow-sm group"
                title="Bấm để xem Hồ sơ & Mục tiêu"
              >
                {/* Avatar with initial letter and green online indicator */}
                <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xs shadow-sm ring-1 ring-emerald-500/20 shrink-0">
                  {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : "U"}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>

                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-bold text-stone-800 max-w-[85px] sm:max-w-[130px] truncate leading-tight group-hover:text-emerald-700">
                    {currentUser.email ? currentUser.email.split("@")[0] : "Thành viên"}
                  </span>
                  <span className="text-[9px] text-emerald-600 font-semibold leading-tight flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Đã đăng nhập
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-stone-200 bg-white/95 px-2 py-2 backdrop-blur-md lg:hidden">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-all ${
                isActive ? "text-emerald-600 font-semibold" : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                  isActive ? "bg-emerald-100 text-emerald-700" : ""
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="truncate max-w-[65px]">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => onSelectTab("settings")}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-all ${
            currentTab === "settings" || currentTab === "profile"
              ? "text-emerald-600 font-semibold"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
              currentTab === "settings" || currentTab === "profile" ? "bg-emerald-100 text-emerald-700" : ""
            }`}
          >
            <Settings className="h-4 w-4" />
          </div>
          <span>Thêm</span>
        </button>
      </nav>
    </>
  );
}

