"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, HAT_CONFIG } from "@/lib/utils";
import { HatScore } from "@/lib/types";
import { submitIdea, getValidationStatus } from "@/lib/api";
import { useApp } from "@/context/AppContext";

const CATEGORIES = ["HealthTech", "E-commerce", "B2B SaaS", "FoodTech", "EdTech", "Inne"];

// Zdefiniowane dane z uwagami agentów (żeby nie zaśmiecać samego HTMLa)
const AGENT_NOTES = [
  {
    role: "Biały · Dyrektor produktu",
    badge: "bg-[#f1f3f5] text-gray-900",
    items: [
      { label: "Dane", text: "Cel pilotażu: 3 miasta, horyzont 12 miesięcy, KPI: liczba wdrożeń, oszczędności budżetowe, retencja użytkowników." },
      { label: "Metryka", text: "KPI: liczba wdrożeń, oszczędności budżetowe, retencja użytkowników." },
      { label: "Ograniczenie", text: "Brak danych o skuteczności algorytmów predykcji." },
      { label: "Brakuje", text: "Dokładnych danych o liczbie wdrożeń w pilotażu." }
    ]
  },
  {
    role: "Biały · Kierownik operacji",
    badge: "bg-[#f1f3f5] text-gray-900",
    items: [
      { label: "Dane", text: "Liczba uczestników pilotażu: 600 osób, złożonych projektów: 200, wdrożonych projektów: 100." },
      { label: "Metryka", text: "Średni czas trwania projektu od PoC do wdrożenia: 90 dni." },
      { label: "Ograniczenie", text: "Brak danych o oszczędnościach budżetowych na etapie wdrażania." },
      { label: "Brakuje", text: "Szczegółów dotyczących retencji użytkowników w różnych miastach." }
    ]
  },
  {
    role: "Biały · Radca prawny (RODO)",
    badge: "bg-[#f1f3f5] text-gray-900",
    items: [
      { label: "Dane", text: "InnoYield to platforma łącząca prediction market z systemem nagradzania wkładu. Platforma umożliwia mieszkańcom i urzędnikom obstawianie prawdopodobieństwa sukcesu." },
      { label: "Metryka", text: "Cel pilotażu: 3 miasta, horyzont 12 miesięcy. KPI: liczba wdrożeń, oszczędności budżetowe, retencja użytkowników." }
    ]
  },
  {
    role: "Czerwony · Dyrektor produktu",
    badge: "bg-red-500 text-white",
    items: [
      { label: "Czuję", text: "Mocno wierzę w sukces tego projektu." },
      { label: "Intuicja", text: "To szansa na innowacyjne rozwiązanie problemów miejskich." },
      { label: "Niepokój", text: "Niepewność co do skuteczności algorytmów predykcji." },
      { label: "Ekscytacja", text: "Możliwość tworzenia przełomowych rozwiązań dla społeczności lokalnych." }
    ]
  },
  {
    role: "Czerwony · Kierownik operacji",
    badge: "bg-red-500 text-white",
    items: [
      { label: "Czuję", text: "Niepewność co do skuteczności algorytmów predykcji w realistycznym środowisku miejskim." },
      { label: "Intuicja", text: "Obawy dotyczące skali i wpływu wprowadzenia platformy na istniejące struktury organizacyjne." },
      { label: "Niepokój", text: "Refleksja nad wyzwaniami prawnymi związanymi z przetwarzaniem danych osobowych." }
    ]
  },
  {
    role: "Czerwony · Radca prawny (RODO)",
    badge: "bg-red-500 text-white",
    items: [
      { label: "Czuję", text: "Brak pewności co do długoterminowych oszczędności i weryfikacji wyników predykcji." },
      { label: "Niepokój", text: "Obawy o zgodność z RODO i bezpieczeństwo danych." },
      { label: "Ekscytacja", text: "Potencjał innowacyjnych rozwiązań dla miast i identyfikacji priorytetów." }
    ]
  },
  {
    role: "Czarny · Dyrektor produktu",
    badge: "bg-[#1e2028] text-white border border-gray-600",
    items: [
      { label: "Ryzyko", text: "Brak danych o skuteczności algorytmów predykcji w realistycznym środowisku miejskim." },
      { label: "Ryzyko", text: "Niepewność co do skali i wpływu wprowadzenia platformy na istniejące struktury." },
      { label: "Ryzyko", text: "Brak danych o oszczędnościach budżetowych na etapie wdrażania." }
    ]
  },
  {
    role: "Czarny · Kierownik operacji",
    badge: "bg-[#1e2028] text-white border border-gray-600",
    items: [
      { label: "Ryzyko", text: "Brak dokładnych danych o liczbie wdrożeń w pilotażu." },
      { label: "Ryzyko", text: "Oczekiwanie na szczegółowe dane dotyczące retencji użytkowników w różnych miastach." }
    ]
  },
  {
    role: "Czarny · Radca prawny (RODO)",
    badge: "bg-[#1e2028] text-white border border-gray-600",
    items: [
      { label: "Ryzyko", text: "Brak danych o skuteczności algorytmów predykcji. To się wyłoży, bo brak odpowiednich testów w zróżnicowanych warunkach miejskich." },
      { label: "Zagrożenie prawne", text: "Ryzyko naruszenia przepisów RODO i regulacji dotyczących ochrony danych." }
    ]
  },
  {
    role: "Żółty · Dyrektor produktu",
    badge: "bg-yellow-400 text-gray-900",
    items: [
      { label: "Szansa", text: "Platforma łącząca prediction market z systemem nagradzania wkładu. Rozwój przez kolejne etapy PoC." },
      { label: "Korzyść", text: "Użytkownicy mają szansę wpływać na decyzje publiczne i wspierać innowacje miejskie." },
      { label: "Wartość", text: "Predictions Market może dostarczać cennych informacji o projektach." },
      { label: "ROI", text: "Potencjalne oszczędności budżetowe i wzrost retencji użytkowników mogą przynieść wymierne zyski." }
    ]
  }
];

export default function SubmitPage() {
  const { user } = useApp();
  const router = useRouter();
  
  const [step, setStep] = useState(0); 
  const [form, setForm] = useState({ title: "", description: "", milestone: "", category: "Inne" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [revealedScores, setRevealedScores] = useState<HatScore[]>([]);
  const [finalStatus, setFinalStatus] = useState<{ status: string; score: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  // Wynik liczymy z niebieskiego kapelusza
  const blueScoreItem = revealedScores.find((r) => r.hat_color === "BLUE");
  const passed = step === 2 && blueScoreItem && blueScoreItem.score >= 5;

  return (
    // ZMIANA: max-w-7xl oraz podział 5 kolumn (3 na lewo, 2 na prawo) - bardzo szerokie i czytelne
    <div className="px-8 py-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-5 gap-10">
      
      {/* LEWA KOLUMNA */}
      <div className="lg:col-span-3 space-y-16">
        
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

        {/* STEP 2: Validation */}
        <div className={cn("transition-all duration-300", step === 0 && " pointer-events-none")}>
          <div className="flex items-start gap-2 sm:gap-3">
            {HAT_ORDER.map((hatColor, i) => {
              const revealed = revealedScores.find((r) => r.hat_color === hatColor);
              const cfg = HAT_CONFIG[hatColor];
              const isActive = step === 1 && !revealed && i === revealedScores.length;
              const isLast = i === HAT_ORDER.length - 1; 
              
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

        {/* STEP 1: Form */}
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

      {/* PRAWA KOLUMNA: Szersza, renderowana warunkowo */}
      <div className="lg:col-span-2">
        <div className="bg-[#181920] border border-[#1e2028] rounded-2xl p-6 h-full flex flex-col">
          <h3 className="text-white font-semibold mb-3">Uwagi agentów</h3>
          
          
          {step < 2 ? (
            // KROK 0: Oczekiwanie
            
            <div>
              <p className="text-[#8b8d97] text-sm leading-relaxed mb-6">
                Po dokonaniu walidacji, agenci AI wystawią swoje uwagi dotyczące pomysłu. Zwróć na nie uwagę przy kolejnych zgłoszeniach, mogą pomóc Ci lepiej zrozumieć, czego szuka społeczność i jak ulepszyć swój pomysł!
              </p>
              <p className="text-[#8b8d97] text-sm leading-relaxed mb-4">
                Zanim wyślesz zgłoszenie upewnij się, że:
              </p>
              <ul className="text-[#8b8d97] text-sm space-y-2 list-disc list-inside">
                <li>Opis jasno definiuje problem</li>
                <li>Określiłeś grupę docelową</li>
                <li>Wskazałeś proponowane rozwiązanie</li>
              </ul>
            </div>
          ) : (
            // KROK 1 i 2: Uwagi od agentów
            // Dodane overflow-y-auto, aby kontener nie rozciągał strony w nieskończoność
            <div className="flex-1 overflow-y-auto max-h-[800px] pr-2 space-y-6 scrollbar-thin scrollbar-thumb-[#2d2f3a] scrollbar-track-transparent">
              {AGENT_NOTES.map((note, idx) => (
                <div key={idx} className="bg-[#13141a] rounded-xl p-4 border border-[#1e2028]">
                  <span className={cn("text-xs font-bold px-2 py-1 rounded-md mb-3 inline-block", note.badge)}>
                    {note.role}
                  </span>
                  <ul className="space-y-2 mt-2">
                    {note.items.map((item, i) => (
                      <li key={i} className="text-sm text-[#8b8d97] leading-relaxed">
                        <strong className="text-white font-medium mr-1">{item.label}:</strong> 
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}