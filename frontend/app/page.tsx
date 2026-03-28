"use client";

import { useState } from "react";
import Listing from "@/components/Listing";
import { mockApi } from "@/lib/mockApi";

const CATEGORIES = ["Wszystkie", "HealthTech", "E-commerce", "B2B SaaS", "FoodTech", "EdTech"];
const SORT_OPTIONS = [
  { value: "hottest", label: "Najpopularniejsze" },
  { value: "newest", label: "Najnowsze" },
  { value: "closing", label: "Kończące się" },
];

export default function MainPage() {
  const [activeCategory, setActiveCategory] = useState("Wszystkie");
  const [sortBy, setSortBy] = useState("hottest");
  const [, forceUpdate] = useState(0);

  let ideas = mockApi.getIdeas();

  if (activeCategory !== "Wszystkie") {
    ideas = ideas.filter((i) => i.category === activeCategory);
  }

  if (sortBy === "hottest") {
    ideas = [...ideas].sort((a, b) => (b.yes_pool + b.no_pool) - (a.yes_pool + a.no_pool));
  } else if (sortBy === "newest") {
    ideas = [...ideas].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sortBy === "closing") {
    ideas = [...ideas].sort((a, b) => new Date(a.market_closes_at).getTime() - new Date(b.market_closes_at).getTime());
  }

  return (
    <div className="px-8 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-1">Rynek Pomysłów</h1>
        <p className="text-[#8b8d97] text-sm">
          Obstawiaj czy twórcy zrealizują swoje milestony. Zarabiaj monety na trafnych przewidywaniach.
        </p>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Category pills */}
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

        {/* Sort select */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-[#1a1c22] border border-[#2d2f3a] text-[#8b8d97] text-xs rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 focus:text-white"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Stats bar */}
      <div className="flex gap-6 mb-6 pb-6 border-b border-[#1e2028]">
        <div>
          <p className="text-[#8b8d97] text-xs mb-0.5">Aktywne rynki</p>
          <p className="text-white font-semibold">{ideas.length}</p>
        </div>
        <div>
          <p className="text-[#8b8d97] text-xs mb-0.5">Wolumen total</p>
          <p className="text-white font-semibold">
            {ideas.reduce((sum, i) => sum + i.yes_pool + i.no_pool, 0).toLocaleString("pl-PL")} 🪙
          </p>
        </div>
        <div>
          <p className="text-[#8b8d97] text-xs mb-0.5">Avg. walidacja</p>
          <p className="text-white font-semibold">
            {Math.round(ideas.reduce((sum, i) => sum + i.validation_score, 0) / ideas.length)}/60
          </p>
        </div>
      </div>

      {/* Listings grid */}
      {ideas.length === 0 ? (
        <div className="text-center py-20 text-[#8b8d97]">
          <p className="text-4xl mb-3">🔍</p>
          <p>Brak pomysłów w tej kategorii</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ideas.map((idea) => (
            <Listing
              key={idea.id}
              idea={idea}
              onBetPlaced={() => forceUpdate((n) => n + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
