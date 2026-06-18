"use client";

import { useState } from "react";
import { criarClienteBrowser } from "@/lib/supabase/client";

export default function HorariosForm({
  acordar, dormir, primeiraVez, onFechar, onSalvo,
}: {
  acordar: string; dormir: string; primeiraVez: boolean;
  onFechar: () => void; onSalvo: () => void;
}) {
  const [a, setA] = useState(acordar || "07:00");
  const [d, setD] = useState(dormir || "23:00");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    const s = criarClienteBrowser();
    const { data: { user } } = await s.auth.getUser();
    if (user) {
      await s.from("profiles").update({ hora_acordar: a, hora_dormir: d }).eq("id", user.id);
    }
    setSalvando(false);
    onSalvo();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={primeiraVez ? undefined : onFechar}>
      <div className="w-full max-w-md space-y-4 rounded-t-3xl bg-white p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Seu dia</h2>
          {!primeiraVez && <button onClick={onFechar} className="text-slate-400">✕</button>}
        </div>
        <p className="text-sm text-slate-500">
          {primeiraVez
            ? "Antes de começar: a que horas você acorda e dorme? Sua agenda nasce entre esses dois momentos."
            : "Ajuste a janela do seu dia."}
        </p>
        <div className="flex gap-3">
          <label className="flex-1 space-y-1">
            <span className="text-xs font-semibold text-slate-500">🌅 Acordar</span>
            <input type="time" value={a} onChange={(e) => setA(e.target.value)}
              className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 focus:ring-2 focus:ring-indigo-400" />
          </label>
          <label className="flex-1 space-y-1">
            <span className="text-xs font-semibold text-slate-500">🌙 Dormir</span>
            <input type="time" value={d} onChange={(e) => setD(e.target.value)}
              className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 focus:ring-2 focus:ring-indigo-400" />
          </label>
        </div>
        <button onClick={salvar} disabled={salvando}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50">
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </div>
  );
}
