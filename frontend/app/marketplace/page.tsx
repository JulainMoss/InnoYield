"use client";

import { useState } from "react";
import { MOCK_MARKET_ITEMS } from "@/lib/mockApi";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Wszystkie", "Jedzenie", "Zakupy", "Rozrywka", "Gaming", "Muzyka"];

export default function MarketplacePage() {
  const { user, buyItem } = useApp();
  const [activeCategory, setActiveCategory] = useState("Wszystkie");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  const items =
    activeCategory === "Wszystkie"
      ? MOCK_MARKET_ITEMS
      : MOCK_MARKET_ITEMS.filter((i) => i.category === activeCategory);

  function handleBuy(itemId: string, itemName: string, price: number) {
    if (user.coin_balance < price) {
      showToast(`Potrzebujesz ${price - user.coin_balance} więcej monet`, false);
      return;
    }
    setBuying(itemId);
    setTimeout(() => {
      const result = buyItem(itemId);
      showToast(result.message, result.success);
      setBuying(null);
    }, 800);
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <div className="px-8 py-8">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg border",
            toast.ok
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "bg-red-500/15 text-red-400 border-red-500/30"
          )}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-1">Marketplace</h1>
        <p className="text-[#8b8d97] text-sm">
          Wymieniaj zarobione monety na nagrody. Twoje saldo:{" "}
          <span className="text-white font-semibold">{user.coin_balance} 🪙</span>
        </p>
      </div>

      {/* Balance banner */}
      <div className="bg-linear-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-[#8b8d97] text-xs mb-0.5">Dostępne monety</p>
          <p className="text-white text-2xl font-bold">{user.coin_balance} 🪙</p>
        </div>
        <div className="text-right">
          <p className="text-[#8b8d97] text-xs mb-0.5">Jak zarabiać więcej?</p>
          <p className="text-indigo-400 text-sm">Obstawiaj trafnie na rynku pomysłów</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              activeCategory === cat
                ? "bg-indigo-600 text-white"
                : "bg-[#1a1c22] text-[#8b8d97] hover:text-white hover:bg-[#22242e]"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item) => {
          const canAfford = user.coin_balance >= item.price;
          const isBeingBought = buying === item.id;

          return (
            <div
              key={item.id}
              className={cn(
                "bg-[#13141a] border rounded-xl p-4 flex flex-col transition-all",
                canAfford
                  ? "border-[#1e2028] hover:border-[#2d2f3a]"
                  : "border-[#1e2028] opacity-60"
              )}
            >
              {/* Emoji icon */}
              <div className="w-12 h-12 rounded-xl bg-[#1a1c22] flex items-center justify-center text-2xl mb-3">
                {item.image_emoji}
              </div>

              {/* Category badge */}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b8d97] mb-2">
                {item.category}
              </span>

              {/* Name */}
              <h3 className="text-white text-sm font-semibold mb-1">{item.name}</h3>

              {/* Description */}
              <p className="text-[#8b8d97] text-xs leading-relaxed flex-1 mb-4">
                {item.description}
              </p>

              {/* Price + buy button */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#8b8d97] text-[10px] mb-0.5">Cena</p>
                  <p className={cn("font-bold text-sm", canAfford ? "text-white" : "text-red-400")}>
                    {item.price} 🪙
                  </p>
                </div>
                <button
                  onClick={() => handleBuy(item.id, item.name, item.price)}
                  disabled={!canAfford || isBeingBought}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                    canAfford && !isBeingBought
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                      : isBeingBought
                      ? "bg-indigo-600/50 text-indigo-300 cursor-wait"
                      : "bg-[#1a1c22] text-[#6b6d77] cursor-not-allowed"
                  )}
                >
                  {isBeingBought ? "⏳" : canAfford ? "Kup" : "Za mało"}
                </button>
              </div>

              {/* Progress bar if close to affording */}
              {!canAfford && user.coin_balance > item.price * 0.3 && (
                <div className="mt-3">
                  <div className="h-1 bg-[#1e2028] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500/50 rounded-full"
                      style={{ width: `${Math.min(100, (user.coin_balance / item.price) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[#6b6d77] mt-1">
                    {user.coin_balance}/{item.price} monet
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
