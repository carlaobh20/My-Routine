
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

const ICONES = ["📖", "💼", "🏋️", "🧘", "🍽️", "💻", "📞", "🛒", "🚶", "🎯", "☕", "📝", "🙏", "🛏️", "🎨", "🎵"];

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
  const [erro, setErro] = useState("");

  const repete = dias.length > 0;
  function toggleDia(i: number) {
    setDias((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));
  }
  function mesmoConjunto(a: number[], b: number[]) {
    return a.length === b.length && a.every((x) => b.includes(x));
  }

  async function salvar() {
    if (!titulo || !hora) { setErro("Preencha o nome e o horário."); return; }
    if (duracao <= 0) { setErro("A duração precisa ser maior que zero."); return; }
    setSalvando(true);
    setErro("");
    const supabase = criarClienteBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro("Sessão expirada. Saia e entre de novo."); setSalvando(false); return; }

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

    let error = null;
    if (edicao) {
      const r = await supabase.from("blocks").update(dados).eq("id", bloco!.id);
      error = r.error;
    } else {
      const r = await supabase.from("blocks").insert({ ...dados, user_id: user.id, data: dataLocal(base) });
      error = r.error;
    }
    setSalvando(false);
    if (error) { setErro(error.message); return; }
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
            {ICONES.map((e)
