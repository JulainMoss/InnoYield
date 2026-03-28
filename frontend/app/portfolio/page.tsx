"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { getMyBets, getMyIdeas } from "@/lib/api";
import { Bet, Idea } from "@/lib/types";
import { timeRemaining, HAT_CONFIG, cn } from "@/lib/utils";

const TABS = [
  { id: "bets", label: "Moje zakłady" },
  { id: "ideas", label: "Moje pomysły" },
];

export default function PortfolioPage() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState("bets");
  const [bets, setBets] = useState<Bet[]>([]);
  const [myIdeas, setMyIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getMyBets(), getMyIdeas()])
      .then(([b, i]) => {
        setBets(b);
        setMyIdeas(i);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="px-8 py-8 text-center">
        <p className="text-4xl mb-3">🔒</p>
        <p className="text-[#8b8d97] text-sm mb-4">Zaloguj się aby zobaczyć swoje portfolio</p>
        <Link href="/login" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
          Zaloguj się
        </Link>
      </div>
    );
  }

  const activeBets = bets.filter((b) => !b.resolved_at);
  const resolvedBets = bets.filter((b) => b.resolved_at);
  const totalInvested = bets.reduce((sum, b) => sum + b.amount, 0);
  const totalWon = resolvedBets.reduce((sum, b) => sum + (b.payout ?? 0), 0);

  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-1">Portfolio</h1>
        <p className="text-[#8b8d97] text-sm">Twoje zakłady i zgłoszone pomysły</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Saldo" value={`${user.coin_balance} 🪙`} color="text-white" />
        <StatCard label="Zainwestowane" value={`${totalInvested} 🪙`} color="text-yellow-400" />
        <StatCard label="Zarobione" value={`${totalWon} 🪙`} color="text-emerald-400" />
        <StatCard label="Aktywne zakłady" value={String(activeBets.length)} color="text-indigo-400" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#13141a] p-1 rounded-xl w-fit border border-[#1e2028]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.id ? "bg-[#1e2028] text-white" : "text-[#8b8d97] hover:text-white"
            )}
          >
            {tab.label}
            <span className={cn(
              "ml-2 text-xs px-1.5 py-0.5 rounded-full",
              activeTab === tab.id ? "bg-indigo-500/20 text-indigo-400" : "bg-[#1a1c22] text-[#8b8d97]"
            )}>
              {tab.id === "bets" ? bets.length : myIdeas.length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => <div key={n} className="h-20 bg-[#13141a] rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {activeTab === "bets" && (
            <div className="space-y-6">
              {activeBets.length > 0 && (
                <section>
                  <h3 className="text-[#8b8d97] text-xs font-semibold uppercase tracking-wider mb-3">Aktywne</h3>
                  <div className="space-y-3">
                    {activeBets.map((bet) => <BetCard key={bet.id} bet={bet} />)}
                  </div>
                </section>
              )}
              {resolvedBets.length > 0 && (
                <section>
                  <h3 className="text-[#8b8d97] text-xs font-semibold uppercase tracking-wider mb-3">Rozliczone</h3>
                  <div className="space-y-3">
                    {resolvedBets.map((bet) => <BetCard key={bet.id} bet={bet} resolved />)}
                  </div>
                </section>
              )}
              {bets.length === 0 && (
                <EmptyState icon="🎯" text="Nie masz jeszcze żadnych zakładów" cta="Przejdź do rynku" href="/" />
              )}
            </div>
          )}

          {activeTab === "ideas" && (
            <div>
              {myIdeas.length === 0 ? (
                <EmptyState icon="💡" text="Nie masz jeszcze żadnych pomysłów" cta="Zgłoś pomysł" href="/submit" />
              ) : (
                <div className="space-y-3">
                  {myIdeas.map((idea) => (
                    <div key={idea.id} className="bg-[#13141a] border border-[#1e2028] rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <Link href={`/ideas/${idea.id}`} className="text-white text-sm font-medium hover:text-indigo-300 transition-colors line-clamp-1">
                            {idea.title}
                          </Link>
                        </div>
                        <StatusBadge status={idea.status} score={idea.validation_score} />
                      </div>
                      {idea.hat_scores.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {idea.hat_scores.map((hs) => {
                            const cfg = HAT_CONFIG[hs.hat_color];
                            return (
                              <span key={hs.hat_color} className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", cfg.color)} title={cfg.desc}>
                                {cfg.label} {hs.score}/10
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1e2028] text-xs text-[#8b8d97]">
                        <span>Wolumen: <span className="text-white">{(idea.yes_pool + idea.no_pool).toLocaleString()} 🪙</span></span>
                        {idea.market_closes_at && (
                          <span>Kończy się: <span className="text-white">{timeRemaining(idea.market_closes_at)}</span></span>
                        )}
                        <span>Walidacja: <span className="text-white">{idea.validation_score}/60</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#13141a] border border-[#1e2028] rounded-xl p-4">
      <p className="text-[#8b8d97] text-xs mb-1">{label}</p>
      <p className={cn("text-xl font-semibold", color)}>{value}</p>
    </div>
  );
}

function BetCard({ bet, resolved }: { bet: Bet; resolved?: boolean }) {
  const prob = bet.current_probability;
  const isYes = bet.position === "YES";
  return (
    <div className="bg-[#13141a] border border-[#1e2028] rounded-xl p-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <Link href={`/ideas/${bet.idea_id}`} className="text-white text-sm font-medium hover:text-indigo-300 transition-colors line-clamp-1">
            {bet.idea_title}
          </Link>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg", isYes ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")}>
            {isYes ? "TAK" : "NIE"}
          </span>
          <span className="text-white font-semibold text-sm">{bet.amount} 🪙</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-[#8b8d97]">
        <span>Szansa: <span className={isYes ? "text-emerald-400" : "text-red-400"}>{isYes ? prob : 100 - prob}%</span></span>
        {resolved && bet.payout != null && (
          <span>Wypłata: <span className="text-emerald-400 font-medium">+{bet.payout} 🪙</span> <span className="text-[#6b6d77]">({bet.multiplier?.toFixed(2)}×)</span></span>
        )}
        {!resolved && bet.market_closes_at && (
          <span>Zamknięcie: {timeRemaining(bet.market_closes_at)}</span>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, score }: { status: string; score: number }) {
  if (status === "VALIDATED") return <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">✓ {score}/60</span>;
  if (status === "REJECTED") return <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 shrink-0">✗ {score}/60</span>;
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-yellow-500/15 text-yellow-400 shrink-0">⏳ Walidacja</span>;
}

function EmptyState({ icon, text, cta, href }: { icon: string; text: string; cta: string; href: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-[#8b8d97] text-sm mb-4">{text}</p>
      <Link href={href} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
        {cta}
      </Link>
    </div>
  );
}
