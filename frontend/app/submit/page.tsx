"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, HAT_CONFIG } from "@/lib/utils";
import { HatScore } from "@/lib/types";
import { submitIdea, getValidationStatus } from "@/lib/api";
import { useApp } from "@/context/AppContext";

type Step = "form" | "validating" | "result";

const CATEGORIES = ["HealthTech", "E-commerce", "B2B SaaS", "FoodTech", "EdTech", "Inne"];

export default function SubmitPage() {
  const { user } = useApp();
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ title: "", description: "", milestone: "", category: "Inne" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [revealedScores, setRevealedScores] = useState<HatScore[]>([]);
  const [finalStatus, setFinalStatus] = useState<{ status: string; score: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for validation status
  useEffect(() => {
    if (step !== "validating" || !ideaId) return;

    pollRef.current = setInterval(async () => {
      try {
        const data = await getValidationStatus(ideaId);
        setRevealedScores(data.hat_scores);

        if (data.status === "VALIDATED" || data.status === "REJECTED") {
          clearInterval(pollRef.current!);
          setFinalStatus({ status: data.status, score: data.validation_score });
          setTimeout(() => setStep("result"), 800);
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
    if (!form.milestone.trim()) e.milestone = "Milestone jest wymagany";
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
      setStep("validating");
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : "Błąd wysyłania" });
    } finally {
      setSubmitting(false);
    }
  }

  const HAT_ORDER = ["WHITE", "RED", "BLACK", "YELLOW", "GREEN", "BLUE"] as const;
  const passed = finalStatus?.status === "VALIDATED";

  return (
    <div className="px-8 py-8 max-w-2xl">
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
        {[{ id: "form", label: "Opis" }, { id: "validating", label: "Walidacja AI" }, { id: "result", label: "Wynik" }].map((s, i, arr) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors", step === s.id ? "bg-indigo-600 text-white" : arr.findIndex((x) => x.id === step) > i ? "bg-emerald-500 text-white" : "bg-[#1e2028] text-[#8b8d97]")}>
              {arr.findIndex((x) => x.id === step) > i ? "✓" : i + 1}
            </div>
            <span className={cn("text-xs font-medium", step === s.id ? "text-white" : "text-[#8b8d97]")}>{s.label}</span>
            {i < arr.length - 1 && <div className={cn("flex-1 h-px", arr.findIndex((x) => x.id === step) > i ? "bg-emerald-500" : "bg-[#1e2028]")} />}
          </div>
        ))}
      </div>

      {/* STEP 1: Form */}
      {step === "form" && (
        <div className="space-y-5">
          {!user && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-yellow-400 text-sm">
              <Link href="/login" className="underline">Zaloguj się</Link> aby zgłosić pomysł
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Tytuł <span className="text-red-400">*</span></label>
            <input
              type="text"
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
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={cn("w-full bg-[#13141a] border rounded-xl px-4 py-3 text-white text-sm outline-none placeholder-[#6b6d77] resize-none", errors.description ? "border-red-500" : "border-[#1e2028] focus:border-indigo-500")}
              placeholder="Opisz problem który rozwiązujesz, dla kogo i jak..."
            />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
            <p className="text-[#6b6d77] text-xs mt-1 text-right">{form.description.length} znaków (min 50)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Milestone w 30 dni <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.milestone}
              onChange={(e) => setForm({ ...form, milestone: e.target.value })}
              className={cn("w-full bg-[#13141a] border rounded-xl px-4 py-3 text-white text-sm outline-none placeholder-[#6b6d77]", errors.milestone ? "border-red-500" : "border-[#1e2028] focus:border-indigo-500")}
              placeholder="np. Opublikuję MVP z 100 pierwszymi użytkownikami"
            />
            {errors.milestone && <p className="text-red-400 text-xs mt-1">{errors.milestone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Kategoria</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-[#13141a] border border-[#1e2028] focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {errors.form && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{errors.form}</div>}

          <button
            onClick={handleSubmit}
            disabled={submitting || !user}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
          >
            {submitting ? "Wysyłanie..." : "Zwaliduj pomysł →"}
          </button>
        </div>
      )}

      {/* STEP 2: Validation */}
      {step === "validating" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Agenci oceniają Twój pomysł...</h2>
            {revealedScores.length > 0 && (
              <span className="text-white text-sm font-bold">
                {revealedScores.reduce((s, h) => s + h.score, 0)}/{revealedScores.length * 10}
              </span>
            )}
          </div>
          <div className="space-y-3 mb-6">
            {HAT_ORDER.map((hatColor, i) => {
              const revealed = revealedScores.find((r) => r.hat_color === hatColor);
              const cfg = HAT_CONFIG[hatColor];
              const isActive = !revealed && i === revealedScores.length;
              return (
                <div key={hatColor} className={cn("rounded-xl border p-4 transition-all duration-500", revealed ? "bg-[#13141a] border-[#2d2f3a]" : isActive ? "bg-[#13141a] border-indigo-500/30 animate-pulse" : "bg-[#0e0f14] border-[#1e2028] opacity-40")}>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-md min-w-[80px] text-center", cfg.color)}>{cfg.label}</span>
                    <div className="flex-1"><p className="text-[#8b8d97] text-xs">{cfg.desc}</p></div>
                    <div className="w-16 text-right">
                      {revealed ? <span className="text-white font-bold text-sm">{revealed.score}/10</span> : isActive ? <span className="text-indigo-400 text-xs">analizuje...</span> : <span className="text-[#6b6d77] text-xs">oczekuje</span>}
                    </div>
                  </div>
                  {revealed && <p className="text-[#8b8d97] text-xs mt-2 leading-relaxed">{revealed.reasoning}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: Result */}
      {step === "result" && finalStatus && (
        <div className="text-center">
          <div className={cn("w-20 h-20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4", passed ? "bg-emerald-500/20" : "bg-red-500/20")}>
            {passed ? "✓" : "✗"}
          </div>
          <h2 className={cn("text-2xl font-bold mb-2", passed ? "text-emerald-400" : "text-red-400")}>
            {passed ? "Pomysł zatwierdzony!" : "Pomysł odrzucony"}
          </h2>
          <p className="text-white text-4xl font-black mb-1">{finalStatus.score}/60</p>
          <p className="text-[#8b8d97] text-sm mb-8">
            {passed ? "Twój pomysł pojawi się na publicznym listingu." : "Nie osiągnąłeś progu 36 punktów. Popraw opis i spróbuj ponownie."}
          </p>
          <div className="flex gap-3">
            {passed ? (
              <Link href="/" className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors text-center">
                Zobacz na rynku
              </Link>
            ) : (
              <button onClick={() => { setStep("form"); setRevealedScores([]); setFinalStatus(null); }} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors">
                Spróbuj ponownie
              </button>
            )}
            <Link href="/" className="px-6 py-3 rounded-xl bg-[#1e2028] hover:bg-[#2a2c36] text-[#8b8d97] hover:text-white font-medium text-sm transition-colors">
              Wróć do rynku
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
