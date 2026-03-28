"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function RegisterPage() {
  const { register } = useApp();
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Błąd rejestracji");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
            IY
          </div>
          <h1 className="text-xl font-semibold text-white">Dołącz do InnoYield</h1>
          <p className="text-[#8b8d97] text-sm mt-1">Zacznij z 20 monetami na start</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Nazwa użytkownika</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full bg-[#13141a] border border-[#1e2028] focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder-[#6b6d77]"
              placeholder="Kaziu"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-[#13141a] border border-[#1e2028] focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder-[#6b6d77]"
              placeholder="kaziu@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Hasło</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-[#13141a] border border-[#1e2028] focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder-[#6b6d77]"
              placeholder="min. 6 znaków"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
          >
            {loading ? "Tworzenie konta..." : "Zarejestruj się — dostań 20 🪙"}
          </button>
        </form>

        <p className="text-center text-[#8b8d97] text-sm mt-6">
          Masz już konto?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
}
