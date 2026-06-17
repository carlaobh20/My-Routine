"use client";

import { useState } from "react";
import { criarClienteBrowser } from "@/lib/supabase/client";

const CATEGORIAS = [
  { nome: "Trabalho", cor: "#4f46e5" },
  { nome: "Pessoal", cor: "#059669" },
  { nome: "Saúde", cor: "#db2777" },
  { nome: "Estudo", cor: "#d97706" },
  { nome: "Outro", cor: "#64748b" },
];

function dataLocal(d = new Date()) {
  const o = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return o.toISOString().slice(0, 10);
}

export default function TaskForm({ onCriado }: { onCriado: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [hora, setHora] = useState("");
  const [duracao, setDuracao] = useState(30);
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [gatilho, setGatilho] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!titulo || !hora) return;
    setSalvando(true);
    const supabase = criarClienteBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSalvando(false); return; }

    const [h, m] = hora.split(":").map(Number);
    const inicio = new Date();
    inicio.setHours(h, m, 0, 0);

    await supabase.from("blocks").insert({
      user_id: user.id,
      titulo,
      data: dataLocal(inicio),
      hora_inicio: inicio.toISOString(),
      duracao_min: duracao,
      categoria: categoria.nome,
      cor: categoria.cor,
    });

    setTitulo(""); setHora(""); setDuracao(30); setGatilho("");
    setCategoria(CATEGORIAS[0]);
    setSalvando(false);
    onCriado();
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <input
        value={titulo} onChange={(e) => setTitulo(e.target.value)}
        placeholder="O que você vai fazer?"
        className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-400"
      />
      <div className="flex flex-wrap gap-2">
        {CATEGORIAS.map((c) => (
          <button
            key={c.nome} onClick={() => setCategoria(c)}
            className="rounded-full px-3 py-1.5 text-sm font-medium transition"
            style={{
              backgroundColor: categoria.nome === c.nome ? c.cor : "#f1f5f9",
              color: categoria.nome === c.nome ? "white" : "#475569",
            }}
          >
            {c.nome}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="time" value={hora} onChange={(e) => setHora(e.target.value)}
          className="rounded-xl border-0 bg-slate-50 px-4 py-3 focus:ring-2 focus:ring-indigo-400"
        />
        <input
          type="number" min={5} step={5} value={duracao}
          onChange={(e) => setDuracao(Number(e.target.value))}
          className="w-24 rounded-xl border-0 bg-slate-50 px-4 py-3 focus:ring-2 focus:ring-indigo-400"
        />
        <span className="text-sm text-slate-500">minutos</span>
      </div>
      <input
        value={gatilho} onChange={(e) => setGatilho(e.target.value)}
        placeholder='Gatilho (ex.: "se são 9h, então abro a planilha")'
        className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-400"
      />
      <button
        onClick={salvar} disabled={salvando}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50"
      >
        {salvando ? "Salvando..." : "Adicionar ao dia"}
      </button>
    </div>
  );
}
