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
} from "lucide-react";

export type TabType =
  | "dashboard"
  | "log-meal"
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
}

export function Navigation({
  currentTab,
  onSelectTab,
  isDemoMode,
  onOpenAuth,
}: NavigationProps) {
  const navItems: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { id: "log-meal", label: "Ghi nhận bữa ăn", icon: Camera },
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
            {isDemoMode ? (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-100"
              >
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Chế độ Demo / Đăng nhập</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Tài khoản Supabase</span>
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

