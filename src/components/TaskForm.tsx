"use client";

import { useState } from "react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { ICONES, IconeAtividade } from "@/lib/icones";

const CATEGORIAS = [
  { nome: "Trabalho", cor: "#4f46e5" },
  { nome: "Pessoal", cor: "#059669" },
  { nome: "Saúde", cor: "#db2777" },
  { nome: "Estudo", cor: "#d97706" },
  { nome: "Outro", cor: "#64748b" },
];

const DIAS = [
  { i: 1, l: "Seg" }, { i: 2, l: "Ter" }, { i: 3, l: "Qua" },
  { i: 4, l: "Qui" }, { i: 5, l: "Sex" }, { i: 6, l: "Sáb" }, { i: 0, l: "Dom" },
];
const UTEIS = [1, 2, 3, 4, 5];
const TODOS = [0, 1, 2, 3, 4, 5, 6];

export type Subtarefa = { texto: string; feito: boolean };
export type BlocoEdit = {
  id: string; titulo: string; hora_inicio: string; duracao_min: number;
  categoria: string | null; cor: string | null; data?: string | null;
  gatilho?: string | null; validade_tipo?: string | null; validade_ate?: string | null;
  dias_semana?: number[] | null; icone?: string | null; subtarefas?: Subtarefa[] | null;
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
  bloco, tituloInicial, horaInicial, onFechar, onSalvo,
}: {
  bloco?: BlocoEdit | null; tituloInicial?: string; horaInicial?: string;
  onFechar: () => void; onSalvo: () => void;
}) {
  const edicao = !!bloco;
  const catInicial = CATEGORIAS.find((c) => c.nome === bloco?.categoria) || CATEGORIAS[0];

  const [titulo, setTitulo] = useState(bloco?.titulo || tituloInicial || "");
  const [hora, setHora] = useState(bloco ? horaDeISO(bloco.hora_inicio) : (horaInicial || ""));
  const [duracao, setDuracao] = useState(bloco?.duracao_min || 30);
  const [categoria, setCategoria] = useState(catInicial);
  const [icone, setIcone] = useState(bloco?.icone || "");
  const [gatilho, setGatilho] = useState(bloco?.gatilho || "");
  const [dias, setDias] = useState<number[]>(bloco?.dias_semana || []);
  const [terminaEm, setTerminaEm] = useState(bloco?.validade_ate || "");
  const [subs, setSubs] = useState<Subtarefa[]>(bloco?.subtarefas || []);
  const [novaSub, setNovaSub] = useState("");
  const [salvando, setSalvando] = useState(false);

  const repete = dias.length > 0;
  function toggleDia(i: number) {
    setDias((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));
  }
  function mesmoConjunto(a: number[], b: number[]) {
    return a.length === b.length && a.every((x) => b.includes(x));
  }

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
      icone: icone || null,
      gatilho: gatilho || null,
      dias_semana: repete ? dias : null,
      validade_tipo: !repete ? "hoje" : terminaEm ? "ate" : "sem",
      validade_ate: repete && terminaEm ? terminaEm : null,
      subtarefas: subs,
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={onFechar}>
      <div className="max-h-[92vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{edicao ? "Editar atividade" : "Nova atividade"}</h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>

        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="O que você vai fazer?"
          className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-400" />

        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map((c) => (
            <button key={c.nome} onClick={() => setCategoria(c)} className="rounded-full px-3 py-1.5 text-sm font-medium transition"
              style={{ backgroundColor: categoria.nome === c.nome ? c.cor : "#f1f5f9", color: categoria.nome === c.nome ? "white" : "#475569" }}>
              {c.nome}
            </button>
          ))}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-600">Ícone</p>
          <div className="flex flex-wrap gap-1.5">
            {ICONES.map((ic) => (
              <button key={ic.k} onClick={() => setIcone(icone === ic.k ? "" : ic.k)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${icone === ic.k ? "bg-indigo-100 ring-2 ring-indigo-400" : "bg-slate-50"}`}>
                <IconeAtividade nome={ic.k} cor={icone === ic.k ? categoria.cor : "#64748b"} size={20} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">Início</span>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)}
              className="block rounded-xl border-0 bg-slate-50 px-4 py-3 focus:ring-2 focus:ring-indigo-400" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">Duração</span>
            <span className="flex items-center gap-1">
              <select value={Math.floor(duracao / 60)} onChange={(e) => setDuracao(Number(e.target.value) * 60 + (duracao % 60))}
                className="rounded-xl border-0 bg-slate-50 px-3 py-3 focus:ring-2 focus:ring-indigo-400">
                {Array.from({ length: 13 }, (_, n) => <option key={n} value={n}>{n}h</option>)}
              </select>
              <select value={duracao % 60} onChange={(e) => setDuracao(Math.floor(duracao / 60) * 60 + Number(e.target.value))}
                className="rounded-xl border-0 bg-slate-50 px-3 py-3 focus:ring-2 focus:ring-indigo-400">
                {[0, 5, 10, 15, 20, 30, 40, 45, 50].map((m) => <option key={m} value={m}>{m}min</option>)}
              </select>
            </span>
          </label>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-600">Repete em</p>
          <div className="mb-2 flex flex-wrap gap-2">
            <button onClick={() => setDias([])} className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${!repete ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>Só hoje</button>
            <button onClick={() => setDias(UTEIS)} className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${mesmoConjunto(dias, UTEIS) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>Dias úteis</button>
            <button onClick={() => setDias(TODOS)} className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${mesmoConjunto(dias, TODOS) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>Todos os dias</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DIAS.map((d) => (
              <button key={d.i} onClick={() => toggleDia(d.i)}
                className={`h-9 w-11 rounded-lg text-xs font-semibold transition ${dias.includes(d.i) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{d.l}</button>
            ))}
          </div>
          {repete && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-slate-500">Termina em</span>
              <input type="date" value={terminaEm} onChange={(e) => setTerminaEm(e.target.value)}
                className="rounded-xl border-0 bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400" />
              {terminaEm && <button onClick={() => setTerminaEm("")} className="text-xs text-slate-400 underline">sem data</button>}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-600">Subtarefas</p>
          <div className="space-y-2">
            {subs.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="flex-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{s.texto}</span>
                <button onClick={() => setSubs(subs.filter((_, k) => k !== idx))} className="text-slate-400">✕</button>
              </div>
            ))}
            <div className="flex gap-2">
              <input value={novaSub} onChange={(e) => setNovaSub(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && novaSub.trim()) { setSubs([...subs, { texto: novaSub.trim(), feito: false }]); setNovaSub(""); } }}
                placeholder="Adicionar passo…"
                className="flex-1 rounded-lg border-0 bg-slate-50 px-3 py-2 text-sm placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-400" />
              <button onClick={() => { if (novaSub.trim()) { setSubs([...subs, { texto: novaSub.trim(), feito: false }]); setNovaSub(""); } }}
                className="rounded-lg bg-indigo-50 px-3 text-indigo-700">+</button>
            </div>
          </div>
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
              className="rounded-xl bg-red-50 px-5 py-3 font-semibold text-red-600 transition hover:bg-red-100">Excluir</button>
          )}
        </div>
      </div>
    </div>
  );
}
