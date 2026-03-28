"use client";

import { useState } from "react";
import Link from "next/link";
import { cn, HAT_CONFIG } from "@/lib/utils";
import { HatScore } from "@/lib/types";

type Step = "form" | "validating" | "result";

const MOCK_VALIDATION_SEQUENCE: HatScore[] = [
  { hat_color: "WHITE", score: 7, reasoning: "Rynek dla tego rozwiązania jest dobrze udokumentowany. Istnieje solidna baza danych o potrzebach użytkowników w tym segmencie." },
  { hat_color: "RED", score: 8, reasoning: "Pomysł wywołuje entuzjazm i rezonuje emocjonalnie. Rozwiązuje realny, odczuwalny ból użytkownika." },
  { hat_color: "BLACK", score: 6, reasoning: "Główne ryzyka to konkurencja i czas realizacji. Należy dokładnie zaplanować milestony." },
  { hat_color: "YELLOW", score: 7, reasoning: "Potencjał komercjalizacji jest wysoki. Kilka ścieżek monetyzacji jest możliwych do wdrożenia." },
  { hat_color: "GREEN", score: 7, reasoning: "Podejście łączy znane elementy w nowy sposób. Innowacja jest ewolucyjna, ale wartościowa." },
  { hat_color: "BLUE", score: 8, reasoning: "Milestone jest konkretny i mierzalny. Plan działania wygląda realistycznie w podanym czasie." },
];

export default function SubmitPage() {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ title: "", description: "", milestone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [revealedScores, setRevealedScores] = useState<HatScore[]>([]);
  const [validationDone, setValidationDone] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Tytuł jest wymagany";
    if (form.title.length > 120) e.title = "Max 120 znaków";
    if (!form.description.trim()) e.description = "Opis jest wymagany";
    if (form.description.length < 50) e.description = "Minimum 50 znaków";
    if (!form.milestone.trim()) e.milestone = "Milestone jest wymagany";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setStep("validating");
    setRevealedScores([]);
    setValidationDone(false);

    // Simulate agents revealing one by one
    MOCK_VALIDATION_SEQUENCE.forEach((score, i) => {
      setTimeout(() => {
        setRevealedScores((prev) => [...prev, score]);
        if (i === MOCK_VALIDATION_SEQUENCE.length - 1) {
          setTimeout(() => setValidationDone(true), 600);
        }
      }, (i + 1) * 1200);
    });
  }

  const totalScore = revealedScores.reduce((sum, s) => sum + s.score, 0);
  const finalScore = MOCK_VALIDATION_SEQUENCE.reduce((sum, s) => sum + s.score, 0);
  const passed = finalScore >= 36;

  return (
    <div className="px-8 py-8 max-w-2xl">
      {/* Back link */}
      <Link href="/" className="text-[#8b8d97] hover:text-white text-sm flex items-center gap-1 mb-6 transition-colors w-fit">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Wróć do rynku
      </Link>

      <h1 className="text-2xl font-semibold text-white mb-1">Zgłoś pomysł</h1>
      <p className="text-[#8b8d97] text-sm mb-8">
        Twój pomysł zostanie oceniony przez 6 agentów AI. Przy wyniku ≥36/60 trafi na publiczny listing.
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { id: "form", label: "Opis" },
          { id: "validating", label: "Walidacja AI" },
          { id: "result", label: "Wynik" },
        ].map((s, i, arr) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
              step === s.id ? "bg-indigo-600 text-white" :
              (arr.findIndex(x => x.id === step) > i) ? "bg-emerald-500 text-white" :
              "bg-[#1e2028] text-[#8b8d97]"
            )}>
              {arr.findIndex(x => x.id === step) > i ? "✓" : i + 1}
            </div>
            <span className={cn(
              "text-xs font-medium",
              step === s.id ? "text-white" : "text-[#8b8d97]"
            )}>
              {s.label}
            </span>
            {i < arr.length - 1 && (
              <div className={cn(
                "flex-1 h-px",
                arr.findIndex(x => x.id === step) > i ? "bg-emerald-500" : "bg-[#1e2028]"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* STEP 1: Form */}
      {step === "form" && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              Tytuł pomysłu <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="np. Aplikacja do zarządzania finansami dla freelancerów"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={cn(
                "w-full bg-[#13141a] border rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder-[#6b6d77]",
                errors.title ? "border-red-500" : "border-[#1e2028] focus:border-indigo-500"
              )}
            />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
            <p className="text-[#6b6d77] text-xs mt-1 text-right">{form.title.length}/120</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              Opis pomysłu <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={5}
              placeholder="Opisz problem który rozwiązujesz, dla kogo, jak i dlaczego jesteś w stanie to zrealizować..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={cn(
                "w-full bg-[#13141a] border rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder-[#6b6d77] resize-none",
                errors.description ? "border-red-500" : "border-[#1e2028] focus:border-indigo-500"
              )}
            />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
            <p className="text-[#6b6d77] text-xs mt-1 text-right">{form.description.length} znaków (min 50)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              Milestone do osiągnięcia w 30 dni <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="np. Opublikuję MVP w App Store z 100 pierwszymi użytkownikami"
              value={form.milestone}
              onChange={(e) => setForm({ ...form, milestone: e.target.value })}
              className={cn(
                "w-full bg-[#13141a] border rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder-[#6b6d77]",
                errors.milestone ? "border-red-500" : "border-[#1e2028] focus:border-indigo-500"
              )}
            />
            {errors.milestone && <p className="text-red-400 text-xs mt-1">{errors.milestone}</p>}
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-xs text-indigo-300">
            <p className="font-semibold mb-1">Jak działa walidacja?</p>
            <p className="text-indigo-300/80">
              6 agentów AI opartych na metodzie 6 Kapeluszy de Bono oceni Twój pomysł (każdy 0–10 pkt).
              Minimalna suma punktów do pojawienia się na publicznym listingu to 36/60.
            </p>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
          >
            Zwaliduj pomysł →
          </button>
        </div>
      )}

      {/* STEP 2: Validation in progress */}
      {step === "validating" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Agenci oceniają Twój pomysł...</h2>
            {revealedScores.length > 0 && (
              <span className="text-white text-sm font-bold">
                {revealedScores.reduce((s, h) => s + h.score, 0)}/
                <span className="text-[#8b8d97]">{revealedScores.length * 10}</span>
              </span>
            )}
          </div>

          <div className="space-y-3 mb-6">
            {MOCK_VALIDATION_SEQUENCE.map((hat, i) => {
              const revealed = revealedScores.find((r) => r.hat_color === hat.hat_color);
              const cfg = HAT_CONFIG[hat.hat_color];
              const isPending = !revealed && i >= revealedScores.length;
              const isActive = !revealed && i === revealedScores.length;

              return (
                <div
                  key={hat.hat_color}
                  className={cn(
                    "rounded-xl border p-4 transition-all duration-500",
                    revealed ? "bg-[#13141a] border-[#2d2f3a]" :
                    isActive ? "bg-[#13141a] border-indigo-500/30 animate-pulse" :
                    "bg-[#0e0f14] border-[#1e2028] opacity-40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-md min-w-[80px] text-center", cfg.color)}>
                      {cfg.label}
                    </span>
                    <div className="flex-1">
                      <p className="text-[#8b8d97] text-xs">{cfg.desc}</p>
                    </div>
                    <div className="w-16 text-right">
                      {revealed ? (
                        <span className="text-white font-bold text-sm">{revealed.score}/10</span>
                      ) : isActive ? (
                        <span className="text-indigo-400 text-xs">analizuje...</span>
                      ) : (
                        <span className="text-[#6b6d77] text-xs">oczekuje</span>
                      )}
                    </div>
                  </div>
                  {revealed && (
                    <p className="text-[#8b8d97] text-xs mt-2 leading-relaxed">{revealed.reasoning}</p>
                  )}
                </div>
              );
            })}
          </div>

          {validationDone && (
            <button
              onClick={() => setStep("result")}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
            >
              Zobacz wynik →
            </button>
          )}
        </div>
      )}

      {/* STEP 3: Result */}
      {step === "result" && (
        <div className="text-center">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4",
            passed ? "bg-emerald-500/20" : "bg-red-500/20"
          )}>
            {passed ? "✓" : "✗"}
          </div>

          <h2 className={cn(
            "text-2xl font-bold mb-2",
            passed ? "text-emerald-400" : "text-red-400"
          )}>
            {passed ? "Pomysł zatwierdzony!" : "Pomysł odrzucony"}
          </h2>

          <p className="text-white text-4xl font-black mb-1">{finalScore}/60</p>
          <p className="text-[#8b8d97] text-sm mb-8">
            {passed
              ? "Twój pomysł pojawi się na publicznym listingu. Inni użytkownicy mogą teraz obstawiać czy osiągniesz milestone."
              : `Nie osiągnąłeś progu 36 punktów. Popraw opis i spróbuj ponownie.`}
          </p>

          <div className="flex gap-3">
            {passed ? (
              <Link
                href="/"
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors text-center"
              >
                Zobacz na rynku
              </Link>
            ) : (
              <button
                onClick={() => { setStep("form"); setRevealedScores([]); setValidationDone(false); }}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
              >
                Popraw i spróbuj ponownie
              </button>
            )}
            <Link
              href="/"
              className="px-6 py-3 rounded-xl bg-[#1e2028] hover:bg-[#2a2c36] text-[#8b8d97] hover:text-white font-medium text-sm transition-colors"
            >
              Wróć do rynku
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
