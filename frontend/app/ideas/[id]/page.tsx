"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Idea } from "@/lib/types";
import { getIdea } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { calcProbability, formatCoins, timeRemaining, formatDate, HAT_CONFIG, cn } from "@/lib/utils";

export default function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, placeBet } = useApp();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [betAmount, setBetAmount] = useState(5);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [expandedHat, setExpandedHat] = useState<string | null>(null);

  useEffect(() => {
    getIdea(id).then(setIdea).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="px-8 py-8 max-w-4xl">
        <div className="h-6 w-20 bg-[#13141a] rounded animate-pulse mb-6" />
        <div className="h-8 w-3/4 bg-[#13141a] rounded animate-pulse mb-4" />
        <div className="h-4 w-1/4 bg-[#13141a] rounded animate-pulse" />
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="px-8 py-8 text-center">
        <p className="text-4xl mb-3">🔍</p>
        <p className="text-[#8b8d97]">Pomysł nie został znaleziony</p>
        <Link href="/" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300 text-sm">← Wróć do rynku</Link>
      </div>
    );
  }

  const prob = calcProbability(idea.yes_pool, idea.no_pool);
  const totalVolume = idea.yes_pool + idea.no_pool;

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleBet(position: "YES" | "NO") {
    if (!user) { showToast("Zaloguj się aby obstawiać", false); return; }
    const result = await placeBet(idea!.id, position, betAmount);
    showToast(result.message, result.success);
    if (result.success) {
      setIdea((prev) => prev ? ({
        ...prev,
        yes_pool: position === "YES" ? prev.yes_pool + betAmount : prev.yes_pool,
        no_pool: position === "NO" ? prev.no_pool + betAmount : prev.no_pool,
      }) : prev);
    }
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      {toast && (
        <div className={cn("fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg border", toast.ok ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30")}>
          {toast.msg}
        </div>
      )}

      <Link href="/" className="text-[#8b8d97] hover:text-white text-sm flex items-center gap-1 mb-6 transition-colors w-fit">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Rynek
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">{idea.category}</span>
        {idea.market_closes_at && (
          <span className="text-[#8b8d97] text-xs flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
            Zamknięcie za {timeRemaining(idea.market_closes_at)}
          </span>
        )}
      </div>

      <h1 className="text-2xl font-semibold text-white leading-snug mb-2">{idea.title}</h1>
      <p className="text-[#8b8d97] text-sm mb-6">
        Zgłoszone przez <span className="text-white font-medium">{idea.creator_username}</span> · {formatDate(idea.created_at)}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#13141a] border border-[#1e2028] rounded-xl p-5">
            <h2 className="text-white text-sm font-semibold mb-2">Opis pomysłu</h2>
            <p className="text-[#a0a3ae] text-sm leading-relaxed break-words">{idea.description}</p>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-5">
            <h2 className="text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">Milestone do osiągnięcia</h2>
            <p className="text-white text-sm font-medium">
              {idea.milestone || "Do ustalenia przez moderatora"}
            </p>
            {idea.market_closes_at && <p className="text-[#8b8d97] text-xs mt-1">do {formatDate(idea.market_closes_at)}</p>}
          </div>

          {idea.hat_scores.length > 0 && (
            <div className="bg-[#13141a] border border-[#1e2028] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-sm font-semibold">Walidacja AI — 6 Kapeluszy de Bono</h2>
                <span className="text-[#8b8d97] text-xs bg-[#1e2028] px-2.5 py-1 rounded-lg">{idea.validation_score}/60</span>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#8b8d97]">Wynik walidacji</span>
                  <span className={cn("font-semibold", idea.validation_score >= 36 ? "text-emerald-400" : "text-red-400")}>
                    {idea.validation_score >= 36 ? "✓ Zatwierdzone" : "✗ Odrzucone"} ({idea.validation_score}/60)
                  </span>
                </div>
                <div className="h-2 bg-[#1e2028] rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", idea.validation_score >= 36 ? "bg-emerald-500" : "bg-red-500")} style={{ width: `${(idea.validation_score / 60) * 100}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                {idea.hat_scores.map((hs) => {
                  const cfg = HAT_CONFIG[hs.hat_color];
                  const isExpanded = expandedHat === hs.hat_color;
                  return (
                    <button key={hs.hat_color} onClick={() => setExpandedHat(isExpanded ? null : hs.hat_color)} className="w-full text-left">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1c22] hover:bg-[#1e2028] transition-colors">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md min-w-[80px] text-center", cfg.color)}>{cfg.label}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[#2d2f3a] rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(hs.score / 10) * 100}%` }} />
                            </div>
                            <span className="text-white text-xs font-bold w-8 text-right">{hs.score}/10</span>
                          </div>
                          <p className="text-[#6b6d77] text-[10px] mt-0.5">{cfg.desc}</p>
                        </div>
                        <svg className={cn("w-3.5 h-3.5 text-[#6b6d77] transition-transform shrink-0", isExpanded && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      {isExpanded && (
                        <div className="px-3 py-2 text-[#a0a3ae] text-xs leading-relaxed bg-[#16181f] rounded-b-lg border-x border-b border-[#1e2028]">
                          {hs.reasoning}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bet panel */}
        <div className="space-y-4">
          <div className="bg-[#13141a] border border-[#1e2028] rounded-xl p-4">
            <h2 className="text-[#8b8d97] text-xs font-semibold uppercase tracking-wider mb-3">Statystyki rynku</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-xs"><span className="text-[#8b8d97]">Wolumen</span><span className="text-white font-medium">{formatCoins(totalVolume)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-[#8b8d97]">Pula TAK</span><span className="text-emerald-400 font-medium">{formatCoins(idea.yes_pool)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-[#8b8d97]">Pula NIE</span><span className="text-red-400 font-medium">{formatCoins(idea.no_pool)}</span></div>
            </div>
          </div>

          <div className="bg-[#13141a] border border-[#1e2028] rounded-xl p-4">
            <h2 className="text-[#8b8d97] text-xs font-semibold uppercase tracking-wider mb-3">Prawdopodobieństwo</h2>
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span className="text-emerald-400">{prob}% TAK</span>
              <span className="text-red-400">{100 - prob}% NIE</span>
            </div>
            <div className="h-3 rounded-full bg-[#1e2028] overflow-hidden">
              <div className="h-full rounded-full bg-linear-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${prob}%` }} />
            </div>
          </div>

          <div className="bg-[#13141a] border border-[#1e2028] rounded-xl p-4">
            <h2 className="text-[#8b8d97] text-xs font-semibold uppercase tracking-wider mb-3">Postaw zakład</h2>
            {user ? (
              <p className="text-[#8b8d97] text-xs mb-3">Saldo: <span className="text-white">{user.coin_balance} 🪙</span></p>
            ) : (
              <div className="mb-3">
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 text-xs">Zaloguj się aby obstawiać →</Link>
              </div>
            )}
            <div className="mb-4">
              <label className="text-[#8b8d97] text-xs mb-1.5 block">Kwota (🪙)</label>
              <div className="flex items-center gap-2 bg-[#1a1c22] border border-[#2d2f3a] rounded-lg p-2">
                <button onClick={() => setBetAmount((v) => Math.max(1, v - 1))} className="w-6 h-6 flex items-center justify-center text-[#8b8d97] hover:text-white text-lg leading-none">−</button>
                <input type="number" min={1} max={user?.coin_balance ?? 999} value={betAmount} onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))} className="flex-1 bg-transparent text-white text-sm font-medium text-center outline-none" />
                <button onClick={() => setBetAmount((v) => Math.min(user?.coin_balance ?? 999, v + 1))} className="w-6 h-6 flex items-center justify-center text-[#8b8d97] hover:text-white text-lg leading-none">+</button>
              </div>
              <div className="flex gap-1.5 mt-2">
                {[5, 10, 25, 50].map((amt) => (
                  <button key={amt} onClick={() => setBetAmount(Math.min(user?.coin_balance ?? 999, amt))} className="flex-1 text-[10px] py-1 rounded bg-[#1e2028] text-[#8b8d97] hover:text-white hover:bg-[#2a2c36] transition-colors">{amt}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleBet("YES")} className="flex-1 py-3 rounded-xl text-sm font-bold transition-all bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white hover:border-emerald-500">
                TAK {prob}¢
              </button>
              <button onClick={() => handleBet("NO")} className="flex-1 py-3 rounded-xl text-sm font-bold transition-all bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white hover:border-red-500">
                NIE {100 - prob}¢
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
