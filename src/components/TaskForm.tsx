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

export type BlocoEdit = {
  id: string; titulo: string; hora_inicio: string; duracao_min: number;
  categoria: string | null; cor: string | null;
  gatilho?: string | null; validade_tipo?: string | null; validade_ate?: string | null;
};

function horaDeISO(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function dataLocal(d = new Date()) {
  const o = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return o.toISOString().slice(0, 10);
}

export default function TaskForm({
  bloco, onFechar, onSalvo,
}: { bloco?: BlocoEdit | null; onFechar: () => void; onSalvo: () => void }) {
  const edicao = !!bloco;
  const catInicial = CATEGORIAS.find((c) => c.nome === bloco?.categoria) || CATEGORIAS[0];

  const [titulo, setTitulo] = useState(bloco?.titulo || "");
  const [hora, setHora] = useState(bloco ? horaDeISO(bloco.hora_inicio) : "");
  const [duracao, setDuracao] = useState(bloco?.duracao_min || 30);
  const [categoria, setCategoria] = useState(catInicial);
  const [gatilho, setGatilho] = useState(bloco?.gatilho || "");
  const [validadeTipo, setValidadeTipo] = useState(bloco?.validade_tipo || "hoje");
  const [validadeAte, setValidadeAte] = useState(bloco?.validade_ate || "");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!titulo || !hora) return;
    setSalvando(true);
    const supabase = criarClienteBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSalvando(false); return; }

    const base = edicao ? new Date(bloco!.hora_inicio) : new Date();
    const [h, m] = hora.split(":").map(Number);
    base.setHours(h, m, 0, 0);

    const dados = {
      titulo,
      hora_inicio: base.toISOString(),
      duracao_min: duracao,
      categoria: categoria.nome,
      cor: categoria.cor,
      gatilho: gatilho || null,
      validade_tipo: validadeTipo,
      validade_ate: validadeTipo === "ate" && validadeAte ? validadeAte : null,
      notificado: false,
    };

    if (edicao) {
      await supabase.from("blocks").update(dados).eq("id", bloco!.id);
    } else {
      await supabase.from("blocks").insert({ ...dados, user_id: user.id, data: dataLocal(base) });
    }
    setSalvando(false);
    onSalvo();
  }

  async function excluir() {
    if (!bloco) return;
    setSalvando(true);
    const supabase = criarClienteBrowser();
    await supabase.from("blocks").delete().eq("id", bloco.id);
    setSalvando(false);
    onSalvo();
  }

  const validades = [
    { t: "hoje", txt: "Só hoje" },
    { t: "ate", txt: "Válida até…" },
    { t: "sem", txt: "Sem validade" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={onFechar}>
      <div
        className="max-h-[92vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{edicao ? "Editar atividade" : "Nova atividade"}</h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>

        <input
          value={titulo} onChange={(e) => setTitulo(e.target.value)}
          placeholder="O que você vai fazer?"
          className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-400"
        />

        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map((c) => (
            <button key={c.nome} onClick={() => setCategoria(c)}
              className="rounded-full px-3 py-1.5 text-sm font-medium transition"
              style={{ backgroundColor: categoria.nome === c.nome ? c.cor : "#f1f5f9", color: categoria.nome === c.nome ? "white" : "#475569" }}>
              {c.nome}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)}
            className="rounded-xl border-0 bg-slate-50 px-4 py-3 focus:ring-2 focus:ring-indigo-400" />
          <input type="number" min={5} step={5} value={duracao} onChange={(e) => setDuracao(Number(e.target.value))}
            className="w-24 rounded-xl border-0 bg-slate-50 px-4 py-3 focus:ring-2 focus:ring-indigo-400" />
          <span className="text-sm text-slate-500">min</span>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-600">Validade</p>
          <div className="flex flex-wrap gap-2">
            {validades.map((v) => (
              <button key={v.t} onClick={() => setValidadeTipo(v.t)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${validadeTipo === v.t ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                {v.txt}
              </button>
            ))}
          </div>
          {validadeTipo === "ate" && (
            <input type="date" value={validadeAte} onChange={(e) => setValidadeAte(e.target.value)}
              className="mt-2 rounded-xl border-0 bg-slate-50 px-4 py-3 focus:ring-2 focus:ring-indigo-400" />
          )}
        </div>

        <input value={gatilho} onChange={(e) => setGatilho(e.target.value)}
          placeholder='Gatilho (ex.: "se são 9h, então abro a planilha")'
          className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-400" />

        <div className="flex gap-2 pt-1">
          <button onClick={salvar} disabled={salvando}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50">
            {salvando ? "Salvando…" : "Salvar"}
          </button>
          {edicao && (
            <button onClick={excluir} disabled={salvando}
              className="rounded-xl bg-red-50 px-5 py-3 font-semibold text-red-600 transition hover:bg-red-100">
              Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
