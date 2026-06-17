"use client";

import { useState } from "react";
import { criarClienteBrowser } from "@/lib/supabase/client";

function dataLocal(d = new Date()) {
  const o = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return o.toISOString().slice(0, 10);
}

export default function ShutdownRitual({
  total, feitos, onFechar,
}: { total: number; feitos: number; onFechar: () => void }) {
  const [nota, setNota] = useState("");
  const [sent, setSent] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    const s = criarClienteBrowser();
    const { data: { user } } = await s.auth.getUser();
    if (user) {
      await s.from("daily_reviews").upsert(
        { user_id: user.id, data: dataLocal(), nota: nota || null, sentimento: sent || null },
        { onConflict: "user_id,data" });
    }
    setSalvando(false);
    onFechar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={onFechar}>
      <div className="w-full max-w-md space-y-4 rounded-t-3xl bg-white p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Encerrar o dia</h2>
          <button onClick={onFechar} className="text-slate-400">✕</button>
        </div>
        <p className="text-sm text-slate-500">
          Você cumpriu <strong className="text-slate-900">{feitos} de {total}</strong> {total === 1 ? "bloco" : "blocos"} hoje.
        </p>
        <div className="flex gap-2">
          {["😞", "😐", "🙂", "😄"].map((e) => (
            <button key={e} onClick={() => setSent(e)}
              className={`flex-1 rounded-xl py-3 text-2xl transition ${sent === e ? "bg-indigo-100 ring-2 ring-indigo-400" : "bg-slate-50"}`}>
              {e}
            </button>
          ))}
        </div>
        <textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Como foi seu dia? (opcional)" rows={3}
          className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-400" />
        <button onClick={salvar} disabled={salvando}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50">
          {salvando ? "Salvando…" : "Fechar o dia"}
        </button>
      </div>
    </div>
  );
}
