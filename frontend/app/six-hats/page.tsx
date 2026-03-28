"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn, HAT_CONFIG } from "@/lib/utils";

type StreamMsg =
  | { kind: "meta"; source: string; delay_ms: number; jitter_ms?: number }
  | { kind: "user"; text: string }
  | { kind: "hat_output"; hat: string; actor_name: string; text: string }
  | { kind: "blue"; score: number; summary: string }
  | { kind: "done" }
  | { kind: "error"; message: string };

function hatKey(hat: string): keyof typeof HAT_CONFIG | null {
  const key = hat?.toUpperCase?.();
  if (!key) return null;
  if (key in HAT_CONFIG) return key as keyof typeof HAT_CONFIG;
  return null;
}

export default function SixHatsPage() {
  const [messages, setMessages] = useState<StreamMsg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [ideaText, setIdeaText] = useState("");

  const BASE_DELAY_MS = 900;
  const JITTER_MS = 450;

  const esRef = useRef<EventSource | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  }, []);

  const activeHat = useMemo((): keyof typeof HAT_CONFIG => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.kind === "blue") return "BLUE";
      if (msg.kind === "hat_output") {
        const key = hatKey(msg.hat);
        if (key) return key;
      }
    }
    return "WHITE";
  }, [messages]);

  function stop() {
    esRef.current?.close();
    esRef.current = null;
    setIsStreaming(false);
  }

  function start(prompt: string) {
    stop();
    setMessages([]);
    setIsStreaming(true);

    setMessages([{ kind: "user", text: prompt }]);

    const url = `${apiBase}/api/mock/six-hats/stream?delay_ms=${encodeURIComponent(BASE_DELAY_MS)}&jitter_ms=${encodeURIComponent(JITTER_MS)}&prompt=${encodeURIComponent(prompt)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("meta", (ev) => {
      const data = JSON.parse((ev as MessageEvent).data);
      setMessages((m) => [
        ...m,
        {
          kind: "meta",
          source: data.source,
          delay_ms: data.delay_ms,
          jitter_ms: data.jitter_ms,
        },
      ]);
    });

    es.addEventListener("hat_output", (ev) => {
      const data = JSON.parse((ev as MessageEvent).data);
      setMessages((m) => [
        ...m,
        {
          kind: "hat_output",
          hat: data.hat ?? "",
          actor_name: data.actor_name ?? "",
          text: data.text ?? "",
        },
      ]);
    });

    es.addEventListener("blue", (ev) => {
      const data = JSON.parse((ev as MessageEvent).data);
      setMessages((m) => [
        ...m,
        { kind: "blue", score: data.score, summary: data.summary },
      ]);
    });

    es.addEventListener("done", () => {
      setMessages((m) => [...m, { kind: "done" }]);
      stop();
    });

    es.onerror = () => {
      setMessages((m) => [
        ...m,
        {
          kind: "error",
          message:
            "Błąd połączenia ze streamem (czy backend działa i CORS pozwala na localhost:3000?)",
        },
      ]);
      stop();
    };
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => stop();
  }, []);

  return (
    <div className="min-h-screen px-6 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-white text-xl font-semibold tracking-tight">
                Analiza: Technika 6 kapeluszy
              </h1>
            </div>
            <p className="text-[#8b8d97] text-sm mt-1">
              Wpisz pomysł i obserwuj, jak kolejne kapelusze/aktorzy dopisują
              wnioski, a na końcu Niebieski robi podsumowanie.
            </p>
          </div>
        </div>

        <div className="border border-[#1e2028] rounded-xl bg-[#0e0f14] overflow-hidden">
          <div className="h-[66vh] overflow-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-[#8b8d97] text-sm">
                Opisz pomysł poniżej i kliknij „Analizuj”.
              </div>
            )}

            {messages.map((msg, idx) => {
              if (msg.kind === "user") {
                return (
                  <div key={idx} className="flex justify-end">
                    <div className="max-w-[85%] bg-indigo-600/20 border border-indigo-500/30 rounded-xl px-4 py-3 text-sm text-white whitespace-pre-wrap">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              if (msg.kind === "error") {
                return (
                  <div key={idx} className="text-xs text-red-400">
                    {msg.message}
                  </div>
                );
              }

              if (msg.kind === "hat_output") {
                const key = hatKey(msg.hat);
                const cfg = key ? HAT_CONFIG[key] : null;

                return (
                  <div key={idx} className="flex gap-3">
                    <div
                      className={cn(
                        "shrink-0 w-10 h-10 rounded-full flex items-center justify-center border",
                        "border-[#1e2028]",
                        cfg ? cfg.color : "bg-[#1a1c22] text-[#8b8d97]",
                      )}
                      title={cfg?.desc ?? msg.hat}
                    >
                      {cfg?.emoji ?? "🎩"}
                    </div>

                    <div className="flex-1">
                      <div className="text-xs text-[#8b8d97] mb-1">
                        <span className="text-white/90">
                          {cfg?.label ?? msg.hat}
                        </span>
                        <span className="mx-2">·</span>
                        <span>{msg.actor_name}</span>
                      </div>
                      <div className="bg-[#0a0b0f] border border-[#1e2028] rounded-xl px-4 py-3 text-sm text-white whitespace-pre-wrap">
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              }

              if (msg.kind === "blue") {
                return (
                  <div key={idx} className="flex gap-3">
                    <div
                      className={cn(
                        "shrink-0 w-10 h-10 rounded-full flex items-center justify-center border",
                        "border-[#1e2028]",
                        HAT_CONFIG.BLUE.color,
                      )}
                      title={HAT_CONFIG.BLUE.desc}
                    >
                      {HAT_CONFIG.BLUE.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-[#8b8d97] mb-1">
                        <span className="text-white/90">
                          {HAT_CONFIG.BLUE.label}
                        </span>
                        <span className="mx-2">·</span>
                        <span>podsumowanie</span>
                      </div>
                      <div className="bg-[#0a0b0f] border border-blue-500/30 rounded-xl px-4 py-3 text-sm text-white">
                        <div className="text-sm font-semibold mb-2">
                          WYNIK: {msg.score}/10
                        </div>
                        <div className="whitespace-pre-wrap text-white/90">
                          {msg.summary}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={idx} className="text-xs text-[#8b8d97]">
                  done
                </div>
              );
            })}

            {isStreaming && (
              <div className="flex gap-3">
                <div
                  className={cn(
                    "shrink-0 w-10 h-10 rounded-full flex items-center justify-center border",
                    "border-[#1e2028]",
                    HAT_CONFIG[activeHat].color,
                  )}
                  title={HAT_CONFIG[activeHat].desc}
                >
                  {HAT_CONFIG[activeHat].emoji}
                </div>

                <div className="flex-1">
                  <div className="text-xs text-[#8b8d97] mb-1">
                    <span className="text-white/90">
                      {HAT_CONFIG[activeHat].label}
                    </span>
                    <span className="mx-2">·</span>
                    <span>pracuję nad analizą</span>
                  </div>
                  <div className="bg-[#0a0b0f] border border-[#1e2028] rounded-xl px-4 py-3 text-sm text-white/90">
                    <span className="dot dot1">.</span>
                    <span className="dot dot2">.</span>
                    <span className="dot dot3">.</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="border-t border-[#1e2028] p-4">
            <div className="flex gap-3 items-end">
              <textarea
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const prompt = ideaText.trim();
                    if (!prompt) {
                      setMessages((m) => [
                        ...m,
                        { kind: "error", message: "Najpierw opisz pomysł." },
                      ]);
                      return;
                    }
                    start(prompt);
                  }
                }}
                placeholder="Opisz swój pomysł… (Enter = analizuj, Shift+Enter = nowa linia)"
                className="flex-1 min-h-11 max-h-40 px-3 py-2 rounded-xl bg-[#0a0b0f] border border-[#1e2028] text-white text-sm outline-none focus:border-indigo-500/60"
                disabled={isStreaming}
              />

              {!isStreaming ? (
                <button
                  onClick={() => {
                    const prompt = ideaText.trim();
                    if (!prompt) {
                      setMessages((m) => [
                        ...m,
                        { kind: "error", message: "Najpierw opisz pomysł." },
                      ]);
                      return;
                    }
                    start(prompt);
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
                >
                  Analizuj
                </button>
              ) : (
                <button
                  onClick={stop}
                  className="px-4 py-2 rounded-lg bg-[#1a1c22] hover:bg-[#22242e] text-white text-sm font-medium"
                >
                  Zatrzymaj
                </button>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="text-xs text-[#8b8d97]">
                Wskazówka: Enter wysyła, Shift+Enter dodaje nową linię.
              </div>
              {!isStreaming && messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-xs text-[#8b8d97] hover:text-white transition-colors"
                >
                  Wyczyść rozmowę
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dot {
          display: inline-block;
          width: 0.6em;
          text-align: center;
          opacity: 0.2;
          animation: dotPulse 1.2s infinite;
        }
        .dot2 {
          animation-delay: 0.2s;
        }
        .dot3 {
          animation-delay: 0.4s;
        }
        @keyframes dotPulse {
          0% {
            opacity: 0.2;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
            transform: translateY(-1px);
          }
          60% {
            opacity: 0.2;
            transform: translateY(0);
          }
          100% {
            opacity: 0.2;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
