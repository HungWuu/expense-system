"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  const handleMicrosoftLogin = () => {
    signIn("azure-ad", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* 左側：ブランディングエリア */}
      <div className="flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 px-8 py-16 lg:w-1/2 lg:py-0">
        <div className="flex flex-col items-center gap-4">
          {/* ロゴアイコン */}
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-sm">
            <svg
              className="h-10 w-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Bridge System
          </h1>
          <p className="text-lg text-white/80">経費管理システム</p>
        </div>
      </div>

      {/* 右側：ログインフォーム */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-8 py-16 lg:w-1/2 lg:py-0">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-100">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900">ログイン</h2>
              <p className="mt-2 text-sm text-gray-500">
                アカウントにサインインしてください
              </p>
            </div>

            <button
              onClick={handleMicrosoftLogin}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#2F2F2F] px-6 py-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#1a1a1a] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F2F2F] active:scale-[0.98]"
            >
              {/* Microsoft ロゴ */}
              <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
              Microsoftでログイン
            </button>

            <p className="mt-6 text-center text-xs text-gray-400">
              ログインすることで利用規約に同意したものとみなされます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
