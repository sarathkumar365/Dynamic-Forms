"use client";
import React from "react";

export default function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="container py-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/logo.png" alt="Company" className="h-5 w-5 rounded-sm" />
          <span className="text-sm text-gray-700 truncate">2Creative Forms</span>
        </div>
        <div className="text-xs text-gray-500">© {year} 2Creative Inc.</div>
      </div>
    </footer>
  );
}

