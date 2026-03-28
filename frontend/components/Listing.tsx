"use client";

import { useState } from "react";
import Link from "next/link";
import { Idea } from "@/lib/types";
import { calcProbability, formatCoins, timeRemaining, cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

interface ListingProps {
  idea: Idea;
  onBetPlaced?: () => void;
}

export default function Listing({ idea, onBetPlaced }: ListingProps) {
  const { user, placeBet } = useApp();
  const [betAmount, setBetAmount] = useState(5);
  const [hoveredPosition, setHoveredPosition] = useState<"YES" | "NO" | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [localIdea, setLocalIdea] = useState(idea);

  const prob = calcProbability(localIdea.yes_pool, localIdea.no_pool);
  const totalVolume = localIdea.yes_pool + localIdea.no_pool;
  const timeLeft = timeRemaining(localIdea.market_closes_at ?? "");

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleBet(position: "YES" | "NO") {
    if (!user) { showToast("Zaloguj się aby obstawiać", false); return; }
    const result = await placeBet(localIdea.id, position, betAmount);
    showToast(result.message, result.success);
    if (result.success) {
      // Optimistic update of pools
      setLocalIdea((prev) => ({
        ...prev,
        yes_pool: position === "YES" ? prev.yes_pool + betAmount : prev.yes_pool,
        no_pool: position === "NO" ? prev.no_pool + betAmount : prev.no_pool,
      }));
      if (onBetPlaced) onBetPlaced();
    }
  }

  return (
    <div className="relative bg-[#13141a] border border-[#1e2028] rounded-xl overflow-hidden hover:border-[#2d2f3a] transition-colors group">
      {toast && (
        <div className={cn("absolute top-3 right-3 z-10 px-3 py-1.5 rounded-lg text-xs font-medium", toast.ok ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30")}>
          {toast.msg}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
            {localIdea.category}
          </span>
          <div className="flex items-center gap-1.5 text-[#8b8d97] text-xs">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
            {timeLeft}
          </div>
        </div>

        <Link href={`/ideas/${localIdea.id}`}>
          <h3 className="text-white text-sm font-medium leading-snug mb-1 line-clamp-2 group-hover:text-indigo-300 transition-colors cursor-pointer">
            {localIdea.title}
          </h3>
        </Link>
        <p className="text-[#8b8d97] text-xs mb-4">by <span className="text-[#a0a3ae]">{localIdea.creator_username}</span></p>

        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-emerald-400 font-semibold">{prob}% TAK</span>
            <span className="text-red-400 font-semibold">{100 - prob}% NIE</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#1e2028] overflow-hidden">
            <div className="h-full rounded-full bg-linear-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${prob}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-1 text-[#8b8d97] text-xs mb-4">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Wolumen: <span className="text-[#a0a3ae]">{formatCoins(totalVolume)}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#1a1c22] rounded-lg px-2 py-1.5 border border-[#2d2f3a]">
            <button onClick={() => setBetAmount((v) => Math.max(1, v - 1))} className="text-[#8b8d97] hover:text-white w-4 h-4 flex items-center justify-center">−</button>
            <span className="text-white text-xs font-medium w-6 text-center">{betAmount}</span>
            <button onClick={() => setBetAmount((v) => Math.min((user?.coin_balance ?? 999), v + 1))} className="text-[#8b8d97] hover:text-white w-4 h-4 flex items-center justify-center">+</button>
          </div>
          <button
            onClick={() => handleBet("YES")}
            onMouseEnter={() => setHoveredPosition("YES")}
            onMouseLeave={() => setHoveredPosition(null)}
            className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border", hoveredPosition === "YES" ? "bg-emerald-500 text-white border-emerald-500" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20")}
          >
            TAK {prob}¢
          </button>
          <button
            onClick={() => handleBet("NO")}
            onMouseEnter={() => setHoveredPosition("NO")}
            onMouseLeave={() => setHoveredPosition(null)}
            className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border", hoveredPosition === "NO" ? "bg-red-500 text-white border-red-500" : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20")}
          >
            NIE {100 - prob}¢
          </button>
        </div>
      </div>
    </div>
  );
}
