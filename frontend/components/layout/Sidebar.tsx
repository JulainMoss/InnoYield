"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  {
    href: "/",
    label: "Rynek",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
    ),
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
        />
      </svg>
    ),
    requireAuth: true,
  },
  {
    href: "/marketplace",
    label: "Marketplace",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />
      </svg>
    ),
  },
  {
    href: "/six-hats",
    label: "Six Hats",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7.5 8.25h9m-9 3h6m-7.5 9.75h12A2.25 2.25 0 0020.25 18.75V6.75A2.25 2.25 0 0018 4.5H6A2.25 2.25 0 003.75 6.75v12A2.25 2.25 0 006 21z"
        />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useApp();

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-[#0e0f14] border-r border-[#1e2028] flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1e2028]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
            IY
          </div>
          <span className="text-white font-semibold text-base tracking-tight">
            InnoYield
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#1e2028] text-white"
                  : "text-[#8b8d97] hover:text-white hover:bg-[#1a1c22]",
              )}
            >
              {link.icon}
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Submit CTA */}
      {user && (
        <div className="px-3 pb-3">
          <Link
            href="/submit"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Dodaj pomysł
          </Link>
        </div>
      )}

      {/* User wallet / auth */}
      <div className="px-3 pb-5 pt-2 border-t border-[#1e2028]">
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#1a1c22]">
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold uppercase">
                {user.username[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {user.username}
                </p>
                <p className="text-[#8b8d97] text-xs">
                  {user.coin_balance.toLocaleString("pl-PL")} 🪙
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full text-xs text-[#8b8d97] hover:text-white py-1.5 transition-colors"
            >
              Wyloguj się
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Link
              href="/login"
              className="flex items-center justify-center w-full py-2.5 rounded-lg bg-[#1a1c22] hover:bg-[#22242e] text-[#8b8d97] hover:text-white text-sm font-medium transition-colors"
            >
              Zaloguj się
            </Link>
            <Link
              href="/register"
              className="flex items-center justify-center w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Zarejestruj się
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
