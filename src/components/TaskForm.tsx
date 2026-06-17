"use client";

import { useState } from "react";
import { criarClienteBrowser } from "@/lib/supabase/client";

export default function TaskForm({ onCriado }: { onCriado: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [hora, setHora] = useState("");
  const [duracao, setDuracao] = useState(30);
  const [gatilho, setGatilho] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!titulo || !hora) return;
    setSalvando(true);
    const supabase = criarClienteBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const hoje = new Date();
    const [h, m] = hora.split(":").map(Number);
    const inicio = new Date(hoje);
    inicio.setHours(h, m, 0, 0);

    await supabase.from("blocks").insert({
      user_id: user.id,
      titulo,
      data: inicio.toISOString().slice(0, 10),
      hora_inicio: inicio.toISOString(),
      duracao_min: duracao,
    });

    setTitulo(""); setHora(""); setDuracao(30); setGatilho("");
    setSalvando(false);
    onCriado();
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      <input
        value={titulo} onChange={(e) => setTitulo(e.target.value)}
        placeholder="O que você vai fazer?"
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />
      <div className="flex gap-3">
        <input
          type="time" value={hora} onChange={(e) => setHora(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
        <input
          type="number" min={5} step={5} value={duracao}
          onChange={(e) => setDuracao(Number(e.target.value))}
          className="w-24 rounded-lg border border-slate-300 px-3 py-2"
        />
        <span className="self-center text-sm text-slate-500">min</span>
      </div>
      <input
        value={gatilho} onChange={(e) => setGatilho(e.target.value)}
        placeholder='Gatilho se-então (ex.: "se são 9h, então abro a planilha")'
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <button
        onClick={salvar} disabled={salvando}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {salvando ? "Salvando..." : "Adicionar bloco"}
      </button>
    </div>
  );
}
