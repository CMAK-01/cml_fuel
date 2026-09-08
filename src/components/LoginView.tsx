"use client";

import { FormEvent, useState } from "react";

type User = { id: number; name: string; email: string; role: string; department: string };

export function LoginView({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Connexion refusée.");
      onAuthenticated(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion indisponible.");
    } finally {
      setLoading(false);
    }
  };

  return <main className="min-h-screen grid place-items-center bg-slate-950 p-4">
    <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
      <h1 className="text-2xl font-extrabold text-slate-900">CML Fuel</h1>
      <p className="mt-1 text-sm text-slate-600">Connectez-vous pour accéder aux opérations carburant.</p>
      <label className="mt-6 block text-sm font-bold text-slate-700">Email
        <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="mt-4 block text-sm font-bold text-slate-700">Mot de passe
        <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={loading} className="mt-6 w-full rounded-lg bg-amber-500 px-4 py-2.5 font-bold text-slate-950 disabled:opacity-60">
        {loading ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  </main>;
}
