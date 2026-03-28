import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calcProbability(yesPool: number, noPool: number): number {
  const total = yesPool + noPool;
  if (total === 0) return 50;
  return Math.round((yesPool / total) * 100);
}

export function formatCoins(amount: number): string {
  return `${amount.toLocaleString("pl-PL")} 🪙`;
}

export function timeRemaining(closesAt: string): string {
  const now = new Date();
  const closes = new Date(closesAt);
  const diffMs = closes.getTime() - now.getTime();

  if (diffMs <= 0) return "Zakończony";

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const HAT_CONFIG = {
  WHITE: { label: "Biały", emoji: "🎩", color: "text-zinc-300", desc: "Fakty i dane" },
  RED: { label: "Czerwony", emoji: "🎩", color: "text-red-400", desc: "Emocje i intuicja" },
  BLACK: { label: "Czarny", emoji: "🎩", color: "text-zinc-400", desc: "Ryzyka i słabości" },
  YELLOW: { label: "Żółty", emoji: "🎩", color: "text-yellow-400", desc: "Korzyści i optymizm" },
  GREEN: { label: "Zielony", emoji: "🎩", color: "text-green-400", desc: "Kreatywność i innowacja" },
  BLUE: { label: "Niebieski", emoji: "🎩", color: "text-blue-400", desc: "Proces i wykonalność" },
};
