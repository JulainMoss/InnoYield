"use client";

import { useState, useEffect } from "react";
import { MarketItem } from "@/lib/types";
import { getMarketCatalog } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import Link from "next/link";

const CATEGORIES = ["Wszystkie", "Jedzenie", "Zakupy", "Rozrywka", "Gaming", "Muzyka"];

export default function MarketplacePage() {
  const { user, buyItem } = useApp();
  const [activeCategory, setActiveCategory] = useState("Wszystkie");
  const [items, setItems] = useState<MarketItem[]>([]);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    getMarketCatalog().then(setItems);
  }, []);

  const filtered = activeCategory === "Wszystkie" ? items : items.filter((i) => i.category === activeCategory);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleBuy(item: MarketItem) {
    if (!user) { showToast("Zaloguj się aby kupować", false); return; }
    if (user.coin_balance < item.price) { showToast(`Potrzebujesz ${item.price - user.coin_balance} więcej monet`, false); return; }
    setBuying(item.id);
    const result = await buyItem(item.id);
    showToast(result.message, result.success);
    setBuying(null);
  }

  return (
    <div className="px-8 py-8">
      {toast && (
        <div className={cn("fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg border", toast.ok ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30")}>
          {toast.msg}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-1">Marketplace</h1>
        <p className="text-[#8b8d97] text-sm">
          Wymieniaj zarobione monety na nagrody.{user && <> Twoje saldo: <span className="text-white font-semibold">{user.coin_balance} 🪙</span></>}
        </p>
      </div>

      {user ? (
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
      ) : (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-6 flex items-center justify-between">
          <p className="text-indigo-300 text-sm">Zaloguj się aby kupować nagrody za monety</p>
          <Link href="/login" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
            Zaloguj się
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors", activeCategory === cat ? "bg-indigo-600 text-white" : "bg-[#1a1c22] text-[#8b8d97] hover:text-white hover:bg-[#22242e]")}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((item) => {
          const canAfford = !!user && user.coin_balance >= item.price;
          const isBeingBought = buying === item.id;
          return (
            <div key={item.id} className={cn("bg-[#13141a] border rounded-xl p-4 flex flex-col transition-all", (!user || !canAfford) ? "border-[#1e2028] opacity-60" : "border-[#1e2028] hover:border-[#2d2f3a]")}>
              <div className="w-12 h-12 rounded-xl bg-[#1a1c22] flex items-center justify-center text-2xl mb-3">{item.image_emoji}</div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b8d97] mb-2">{item.category}</span>
              <h3 className="text-white text-sm font-semibold mb-1">{item.name}</h3>
              <p className="text-[#8b8d97] text-xs leading-relaxed flex-1 mb-4">{item.description}</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#8b8d97] text-[10px] mb-0.5">Cena</p>
                  <p className={cn("font-bold text-sm", canAfford ? "text-white" : "text-red-400")}>{item.price} 🪙</p>
                </div>
                <button
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford || isBeingBought}
                  className={cn("px-3 py-2 rounded-lg text-xs font-semibold transition-all", canAfford && !isBeingBought ? "bg-indigo-600 hover:bg-indigo-500 text-white" : isBeingBought ? "bg-indigo-600/50 text-indigo-300 cursor-wait" : "bg-[#1a1c22] text-[#6b6d77] cursor-not-allowed")}
                >
                  {isBeingBought ? "⏳" : canAfford ? "Kup" : user ? "Za mało" : "Zaloguj"}
                </button>
              </div>
              {user && !canAfford && user.coin_balance > item.price * 0.3 && (
                <div className="mt-3">
                  <div className="h-1 bg-[#1e2028] rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500/50 rounded-full" style={{ width: `${Math.min(100, (user.coin_balance / item.price) * 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-[#6b6d77] mt-1">{user.coin_balance}/{item.price} monet</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
