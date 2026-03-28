"use client";

import { useState, useEffect } from "react";
import Listing from "@/components/Listing";
import { Idea } from "@/lib/types";
import { getIdeas } from "@/lib/api";

const CATEGORIES = ["Wszystkie", "HealthTech", "E-commerce", "B2B SaaS", "FoodTech", "EdTech", "Inne"];
const SORT_OPTIONS = [
  { value: "hottest", label: "Najpopularniejsze" },
  { value: "newest", label: "Najnowsze" },
  { value: "closing", label: "Kończące się" },
];

export default function MainPage() {
  const [activeCategory, setActiveCategory] = useState("Wszystkie");
  const [sortBy, setSortBy] = useState("hottest");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchIdeas() {
    try {
      setError("");
      const data = await getIdeas(sortBy, activeCategory !== "Wszystkie" ? activeCategory : undefined);
      setIdeas(data);
    } catch {
      setError("Nie można połączyć z serwerem. Czy backend jest uruchomiony?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    fetchIdeas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, sortBy]);

  const totalVolume = ideas.reduce((sum, i) => sum + i.yes_pool + i.no_pool, 0);

  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-1">Rynek Pomysłów</h1>
        <p className="text-[#8b8d97] text-sm">
          Obstawiaj czy twórcy zrealizują swoje milestony. Zarabiaj monety na trafnych przewidywaniach.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-[#1a1c22] text-[#8b8d97] hover:text-white hover:bg-[#22242e]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-[#1a1c22] border border-[#2d2f3a] text-[#8b8d97] text-xs rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 focus:text-white"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="flex gap-6 mb-6 pb-6 border-b border-[#1e2028]">
          <div>
            <p className="text-[#8b8d97] text-xs mb-0.5">Aktywne rynki</p>
            <p className="text-white font-semibold">{ideas.length}</p>
          </div>
          <div>
            <p className="text-[#8b8d97] text-xs mb-0.5">Wolumen total</p>
            <p className="text-white font-semibold">{totalVolume.toLocaleString("pl-PL")} 🪙</p>
          </div>
        </div>
      )}

      {/* States */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-[#13141a] border border-[#1e2028] rounded-xl h-52 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={fetchIdeas} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300">
            Spróbuj ponownie
          </button>
        </div>
      )}

      {!loading && !error && ideas.length === 0 && (
        <div className="text-center py-20 text-[#8b8d97]">
          <p className="text-4xl mb-3">🔍</p>
          <p>Brak pomysłów w tej kategorii</p>
        </div>
      )}

      {!loading && !error && ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ideas.map((idea) => (
            <Listing key={idea.id} idea={idea} onBetPlaced={fetchIdeas} />
          ))}
        </div>
      )}
    </div>
  );
}
