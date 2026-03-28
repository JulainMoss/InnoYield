"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, HAT_CONFIG } from "@/lib/utils";
import { HatScore } from "@/lib/types";
import { submitIdea, getValidationStatus } from "@/lib/api";
import { useApp } from "@/context/AppContext";

const CATEGORIES = ["HealthTech", "E-commerce", "B2B SaaS", "FoodTech", "EdTech", "Inne"];

export default function SubmitPage() {
  const { user } = useApp();
  const router = useRouter();
  
  const [step, setStep] = useState(0); 
  const [form, setForm] = useState({ title: "", description: "", category: "Inne" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [revealedScores, setRevealedScores] = useState<HatScore[]>([]);
  const [finalStatus, setFinalStatus] = useState<{ status: string; score: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for validation status
  useEffect(() => {
    if (step !== 1 || !ideaId) return;

    pollRef.current = setInterval(async () => {
      try {
        const data = await getValidationStatus(ideaId);
        setRevealedScores(data.hat_scores);

        if (data.status === "VALIDATED" || data.status === "REJECTED") {
          clearInterval(pollRef.current!);
          setFinalStatus({ status: data.status, score: data.validation_score });
          setTimeout(() => setStep(2), 800);
        }
      } catch {
        // silently retry
      }
    }, 1500);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, ideaId]);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Tytuł jest wymagany";
    if (form.title.length > 200) e.title = "Max 200 znaków";
    if (!form.description.trim()) e.description = "Opis jest wymagany";
    if (form.description.trim().length < 50) e.description = "Minimum 50 znaków";
    return e;
  }

  async function handleSubmit() {
    if (!user) { router.push("/login"); return; }
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const res = await submitIdea(form);
      setIdeaId(res.idea_id);
      setRevealedScores([]);
      setFinalStatus(null);
      setStep(1);
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : "Błąd wysyłania" });
    } finally {
      setSubmitting(false);
    }
  }

  const HAT_ORDER = ["WHITE", "RED", "BLACK", "YELLOW", "GREEN", "BLUE"] as const;
  const passed = finalStatus?.status === "VALIDATED";

  return (
    // Główny kontener grid - dzieli całą stronę na kolumny
    <div className="px-8 py-8 max-w-5xl w-full grid grid-cols-1 lg:grid-cols-3 gap-10">
      
      {/* LEWA KOLUMNA: Nagłówek, Walidacja, Formularz */}
      <div className="lg:col-span-2 space-y-16">
        
        {/* HEADER */}
        <div>
          <Link href="/" className="text-[#8b8d97] hover:text-white text-sm flex items-center gap-1 mb-6 transition-colors w-fit">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Wróć do rynku
          </Link>

          <h1 className="text-2xl font-semibold text-white mb-1">Zgłoś pomysł</h1>
          <p className="text-[#8b8d97] text-sm mb-8">
            Twój pomysł zostanie oceniony przez 6 agentów AI. Przy wyniku wystawionym przez niebieskiego agenta ≥5/10 trafi na publiczny listing.
          </p>
        </div>

        {/* STEP 2: Validation (Widoczne zawsze, aktywne gdy krok >= 1) */}
        <div className={cn("transition-all duration-300", step === 0 && " pointer-events-none")}>
          <div className="flex items-start gap-2 sm:gap-3">
            {HAT_ORDER.map((hatColor, i) => {
              const revealed = revealedScores.find((r) => r.hat_color === hatColor);
              const cfg = HAT_CONFIG[hatColor];
              const isActive = step === 1 && !revealed && i === revealedScores.length;
              const isLast = i === HAT_ORDER.length - 1; 
              
              // Mapowanie kolorów tła i tekstu dla całego kafelka
              const getHatStyle = (color: string) => {
                switch (color) {
                  case "WHITE": return "bg-[#f1f3f5] text-gray-900 border-[#dee2e6]";
                  case "RED": return "bg-red-500 text-white border-red-600";
                  case "BLACK": return "bg-[#1e2028] text-white border-black shadow-inner";
                  case "YELLOW": return "bg-yellow-400 text-gray-900 border-yellow-500";
                  case "GREEN": return "bg-emerald-500 text-white border-emerald-600";
                  case "BLUE": return "bg-blue-500 text-white border-blue-600";
                  default: return "bg-gray-500 text-white border-gray-600";
                }
              };

              const hatStyle = getHatStyle(hatColor);
              
              return (
                <div key={hatColor} className={cn("flex flex-col", isLast ? "flex-[1.3]" : "flex-1")}>
                  <div 
                    className={cn(
                      "rounded-xl border flex items-center justify-center transition-all duration-500 text-center w-full shadow-lg",
                      isLast ? "p-3 min-h-[90px] sm:min-h-[110px]" : "p-2 sm:p-3 min-h-[70px] sm:min-h-[86px] mt-2",
                      hatStyle,
                      revealed ? "opacity-60 scale-100" : isActive ? "opacity-60 animate-pulse ring-2 ring-white/40 scale-105" : "opacity-40 scale-95"
                    )}
                  >
                    {revealed ? (
                      <span className="text-2xl sm:text-3xl font-black">{revealed.score}</span>
                    ) : isActive ? (
                      <span className="text-sm sm:text-base font-bold animate-pulse">...</span>
                    ) : (
                      <span className="text-xs sm:text-sm font-bold break-words">{cfg.label}</span>
                    )}
                  </div>
                  
                  {/* Wynik pod ostatnim kafelkiem (ZMIENIONY NA OCENĘ NIEBIESKIEGO) */}
                  {isLast && (
                    <div className="mt-3 text-center transition-all duration-300">
                      <div className="text-white text-xl sm:text-2xl font-black flex items-baseline justify-center gap-0.5">
                        {step > 0 ? (revealed?.score || 0) : 0}
                        <span className="text-sm font-medium text-[#8b8d97]">/10</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div className={cn("w-30 h-30 rounded-full flex items-center justify-center text-3xl mb-4", step === 2 ? (passed ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400") : "bg-[#1e2028] text-[#8b8d97]")}>
              {step === 2 ? (passed ? "✓" : "✗") : "?"}
            </div>
          </div>
          <h3 className={cn("text-2xl font-bold mb-2", step === 2 ? (passed ? "text-emerald-400" : "text-red-400") : "text-white")}>
            {step === 2 ? (passed ? "Pomysł zatwierdzony!" : "Pomysł odrzucony") : "Oczekiwanie na wynik"}
          </h3>
          
          <p className="text-[#8b8d97] text-sm mb-8">
            {step === 2 
              ? (passed ? "Twój pomysł pojawi się na publicznym listingu." : "Twój pomysł został odrzucony.")
              : "Wypełnij formularz i rozpocznij walidację."}
          </p>
        </div>

        {/* STEP 1: Form (Widoczne zawsze, blokowane po przejściu dalej) */}
        <div className={cn("space-y-5 transition-all duration-300", step > 0 && "opacity-50 pointer-events-none")}>
          
          {!user && step === 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-yellow-400 text-sm">
              <Link href="/login" className="underline">Zaloguj się</Link> aby zgłosić pomysł
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Tytuł <span className="text-red-400">*</span></label>
            <input
              type="text"
              disabled={step > 0}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={cn("w-full bg-[#13141a] border rounded-xl px-4 py-3 text-white text-sm outline-none placeholder-[#6b6d77]", errors.title ? "border-red-500" : "border-[#1e2028] focus:border-indigo-500")}
              placeholder="np. Aplikacja do zarządzania finansami dla freelancerów"
            />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Opis <span className="text-red-400">*</span></label>
            <textarea
              rows={5}
              disabled={step > 0}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={cn("w-full bg-[#13141a] border rounded-xl px-4 py-3 text-white text-sm outline-none placeholder-[#6b6d77] resize-none", errors.description ? "border-red-500" : "border-[#1e2028] focus:border-indigo-500")}
              placeholder="Opisz problem który rozwiązujesz, dla kogo i jak..."
            />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
            <p className="text-[#6b6d77] text-xs mt-1 text-right">{form.description.length} znaków (min 50)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Kategoria</label>
            <select
              disabled={step > 0}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-[#13141a] border border-[#1e2028] focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {errors.form && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{errors.form}</div>}

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting || step > 0}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
            >
              {submitting ? "Wysyłanie..." : "Zwaliduj pomysł →"}
            </button>
            <Link 
              href="/" 
              className={cn(
                "flex-1 py-3 rounded-xl bg-[#1e2028] hover:bg-[#2a2c36] text-[#8b8d97] hover:text-white font-medium text-sm transition-colors flex items-center justify-center text-center", 
                step <= 2 && "pointer-events-none"
              )}
            >
              Wystaw pomysł
            </Link>
          </div>
        </div>

      </div>

      {/* PRAWA KOLUMNA: Nowe pole */}
      <div className="lg:col-span-1">
        <div className="bg-[#181920] border border-[#1e2028] rounded-2xl p-6 h-full">
          <h3 className="text-white font-semibold mb-3">Dodatkowe informacje</h3>
          <p className="text-[#8b8d97] text-sm leading-relaxed mb-4">
            Zanim wyślesz zgłoszenie upewnij się, że:
          </p>
          <ul className="text-[#8b8d97] text-sm space-y-2 list-disc list-inside">
            <li>Opis jasno definiuje problem</li>
            <li>Określiłeś grupę docelową</li>
            <li>Wskazałeś proponowane rozwiązanie</li>
          </ul>
        </div>
      </div>

    </div>
  );
}