"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { criarClienteBrowser } from "@/lib/supabase/client";
import TaskForm, { BlocoEdit, Subtarefa } from "@/components/TaskForm";
import PushManager from "@/components/PushManager";
import FocusMode from "@/components/FocusMode";
import ShutdownRitual from "@/components/ShutdownRitual";
import HorariosForm from "@/components/HorariosForm";
import { SeloAtividade } from "@/lib/icones";
import { Home as IcHome, CalendarDays, TrendingUp, BarChart3, Settings, Plus, ChevronLeft, ChevronRight, Pencil, Sun, Moon, Sparkles, Play } from "lucide-react";

type Bloco = BlocoEdit;
type ExecHist = { block_id: string; status: string; data: string; minutos_cumpridos: number };
type InboxItem = { id: string; texto: string };

const CAT_COR: Record<string, string> = {
  Trabalho: "#4f46e5", Pessoal: "#059669", "Saúde": "#db2777", Estudo: "#d97706", Outro: "#64748b",
};

function dataLocal(d = new Date()) {
  const o = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return o.toISOString().slice(0, 10);
}
function inicioHoje(b: Bloco, base = new Date()) {
  const t = new Date(b.hora_inicio);
  const d = new Date(base);
  d.setHours(t.getHours(), t.getMinutes(), 0, 0);
  return d;
}
function hhmmDe(d: Date) { return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
function paraData(hhmm: string, base = new Date()) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(base); d.setHours(h, m, 0, 0); return d;
}
function fmtDur(min: number) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h > 0 ? `${h}h${m > 0 ? " " + m + "min" : ""}` : `${m}min`;
}
function apareceEm(b: Bloco, base: Date) {
  const ds = dataLocal(base);
  const wd = base.getDay();
  if (!b.dias_semana || b.dias_semana.length === 0) return b.data === ds;
  if (!b.dias_semana.includes(wd)) return false;
  if (b.data && b.data > ds) return false;
  if (b.validade_ate && b.validade_ate < ds) return false;
  return true;
}
function calcStreak(b: Bloco, feitos: Set<string>) {
  if (!b.dias_semana || b.dias_semana.length === 0) return { atual: 0, recorde: 0 };
  const hoje = new Date(); const hojeStr = dataLocal(hoje);
  let atual = 0;
  for (let d = 0; d < 120; d++) {
    const dia = new Date(hoje); dia.setDate(hoje.getDate() - d);
    const ds = dataLocal(dia);
    if (b.data && ds < b.data) break;
    if (!b.dias_semana.includes(dia.getDay())) continue;
    if (feitos.has(ds)) atual++;
    else if (ds === hojeStr) continue;
    else break;
  }
  let recorde = 0, run = 0;
  for (let d = 120; d >= 0; d--) {
    const dia = new Date(hoje); dia.setDate(hoje.getDate() - d);
    const ds = dataLocal(dia);
    if (ds > hojeStr) continue;
    if (b.data && ds < b.data) continue;
    if (!b.dias_semana.includes(dia.getDay())) continue;
    if (feitos.has(ds)) { run++; recorde = Math.max(recorde, run); }
    else if (ds === hojeStr) { /* pendente */ }
    else { run = 0; }
  }
  return { atual, recorde: Math.max(recorde, atual) };
}

const CARD = "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700/60";

export default function Home() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [agora, setAgora] = useState(new Date());
  const [todos, setTodos] = useState<Bloco[]>([]);
  const [hist, setHist] = useState<ExecHist[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [novoInbox, setNovoInbox] = useState("");
  const [aba, setAba] = useState<"hoje" | "meudia" | "progresso" | "semana">("hoje");
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [form, setForm] = useState<null | "novo" | Bloco>(null);
  const [prefill, setPrefill] = useState<{ titulo: string; inboxId: string; hora?: string } | null>(null);
  const [ajustes, setAjustes] = useState(false);
  const [foco, setFoco] = useState<Bloco | null>(null);
  const [encerrar, setEncerrar] = useState(false);
  const [perfil, setPerfil] = useState<{ hora_acordar: string | null; hora_dormir: string | null } | null>(null);
  const [editarHorarios, setEditarHorarios] = useState(false);
  const [tema, setTema] = useState<"claro" | "escuro">("claro");

  useEffect(() => {
    const t = (typeof window !== "undefined" && localStorage.getItem("tema")) === "escuro" ? "escuro" : "claro";
    setTema(t);
  }, []);
  function alternarTema() {
    const novo = tema === "claro" ? "escuro" : "claro";
    setTema(novo);
    try { localStorage.setItem("tema", novo); } catch {}
    document.documentElement.classList.toggle("dark", novo === "escuro");
  }

  async function carregar() {
    const supabase = criarClienteBrowser();
    const { data: bs } = await supabase
      .from("blocks")
      .select("id,titulo,hora_inicio,duracao_min,categoria,cor,data,gatilho,validade_tipo,validade_ate,dias_semana,icone,subtarefas");
    const desde = dataLocal(new Date(Date.now() - 120 * 86400000));
    const { data: hs } = await supabase.from("executions").select("block_id,status,data,minutos_cumpridos").gte("data", desde);
    const { data: prof } = await supabase.from("profiles").select("hora_acordar,hora_dormir").maybeSingle();
    const { data: ib } = await supabase.from("inbox_items").select("id,texto").order("criado_em");
    setTodos(bs ?? []);
    setHist((hs ?? []) as ExecHist[]);
    setPerfil(prof ?? { hora_acordar: null, hora_dormir: null });
    setInbox((ib ?? []) as InboxItem[]);
  }

  useEffect(() => {
    const supabase = criarClienteBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      carregar().then(() => setCarregando(false));
    });
  }, [router]);

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hojeStr = dataLocal(agora);
  const execsHoje = useMemo(() => {
    const m: Record<string, string> = {};
    hist.filter((e) => e.data === hojeStr).forEach((e) => { m[e.block_id] = e.status; });
    return m;
  }, [hist, hojeStr]);

  async function registrar(id: string, status: string, min: number) {
    const supabase = criarClienteBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const minutos = status === "cumprido" ? min : status === "parcial" ? Math.round(min / 2) : 0;
    await supabase.from("executions").upsert(
      { block_id: id, user_id: user.id, status, minutos_cumpridos: minutos, data: dataLocal() },
      { onConflict: "block_id,data" });
    carregar();
  }

  async function toggleSub(b: Bloco, idx: number) {
    const subs: Subtarefa[] = [...(b.subtarefas || [])];
    subs[idx] = { ...subs[idx], feito: !subs[idx].feito };
    const supabase = criarClienteBrowser();
    await supabase.from("blocks").update({ subtarefas: subs }).eq("id", b.id);
    carregar();
  }

  async function toggleDiaCheck(b: Bloco, dia: Date) {
    const ds = dataLocal(dia);
    const supabase = criarClienteBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ex = hist.find((e) => e.block_id === b.id && e.data === ds);
    if (ex && ex.status === "cumprido") {
      await supabase.from("executions").delete().eq("block_id", b.id).eq("data", ds);
    } else {
      await supabase.from("executions").upsert(
        { block_id: b.id, user_id: user.id, status: "cumprido", minutos_cumpridos: b.duracao_min, data: ds },
        { onConflict: "block_id,data" });
    }
    carregar();
  }

  async function addInbox() {
    if (!novoInbox.trim()) return;
    const supabase = criarClienteBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("inbox_items").insert({ user_id: user.id, texto: novoInbox.trim() });
    setNovoInbox("");
    carregar();
  }
  async function removerInbox(id: string) {
    const supabase = criarClienteBrowser();
    await supabase.from("inbox_items").delete().eq("id", id);
    carregar();
  }

  const blocos = useMemo(
    () => todos.filter((b) => apareceEm(b, agora)).sort((a, b) => +inicioHoje(a, agora) - +inicioHoje(b, agora)),
    [todos, agora],
  );

  const resumo = useMemo(() => {
    const total = blocos.length;
    let pontos = 0, feitos = 0, minutosDia = 0;
    blocos.forEach((b) => {
      minutosDia += b.duracao_min;
      if (execsHoje[b.id] === "cumprido") { pontos += 1; feitos += 1; }
      else if (execsHoje[b.id] === "parcial") pontos += 0.5;
    });
    const pct = total ? Math.round((pontos / total) * 100) : 0;
    const atual = blocos.find((b) => {
      const i = inicioHoje(b, agora); const f = new Date(i.getTime() + b.duracao_min * 60000);
      return agora >= i && agora < f;
    });
    const proximo = blocos.find((b) => inicioHoje(b, agora) > agora);
    return { total, pct, atual, proximo, feitos, horasDia: minutosDia / 60 };
  }, [blocos, execsHoje, agora]);

  const xpTotal = useMemo(() => hist.reduce((s, e) => s + (e.minutos_cumpridos || 0), 0), [hist]);
  const nivel = Math.floor(xpTotal / 300) + 1;
  const pctNivel = Math.round(((xpTotal % 300) / 300) * 100);

  const feitosPorBloco = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    hist.filter((e) => e.status === "cumprido" || e.status === "parcial").forEach((e) => {
      (m[e.block_id] = m[e.block_id] || new Set()).add(e.data);
    });
    return m;
  }, [hist]);

  const ultimos7 = useMemo(() => {
    const arr: { label: string; pct: number; total: number }[] = [];
    for (let d = 6; d >= 0; d--) {
      const dia = new Date(); dia.setDate(dia.getDate() - d);
      const ds = dataLocal(dia);
      const agendados = todos.filter((b) => apareceEm(b, dia));
      const total = agendados.length;
      const feitos = agendados.filter((b) => hist.some((e) => e.block_id === b.id && e.data === ds && e.status === "cumprido")).length;
      arr.push({ label: dia.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3), pct: total ? Math.round((feitos / total) * 100) : 0, total });
    }
    return arr;
  }, [todos, hist]);

  const porCategoria = useMemo(() => {
    const m: Record<string, number> = {};
    hist.forEach((e) => {
      const b = todos.find((x) => x.id === e.block_id);
      const c = b?.categoria || "Outro";
      m[c] = (m[c] || 0) + (e.minutos_cumpridos || 0);
    });
    return Object.entries(m).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  }, [hist, todos]);

  const recorrentes = useMemo(() => todos.filter((b) => b.dias_semana && b.dias_semana.length > 0), [todos]);

  const semana = useMemo(() => {
    const base = new Date(); base.setDate(base.getDate() + semanaOffset * 7);
    const dow = (base.getDay() + 6) % 7;
    const monday = new Date(base); monday.setDate(base.getDate() - dow); monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, k) => { const d = new Date(monday); d.setDate(monday.getDate() + k); return d; });
  }, [semanaOffset]);

  const acompanhamento = useMemo(() => {
    const hj = dataLocal();
    const linhas = todos
      .filter((b) => b.dias_semana && b.dias_semana.length > 0)
      .filter((b) => semana.some((dia) => apareceEm(b, dia)))
      .map((b) => {
        const celulas = semana.map((dia) => {
          const ds = dataLocal(dia);
          if (!apareceEm(b, dia)) return { ds, dia, estado: "vazio" as const };
          const ex = hist.find((e) => e.block_id === b.id && e.data === ds);
          if (ex) return { ds, dia, estado: ex.status as "cumprido" | "parcial" | "nao" };
          if (ds < hj) return { ds, dia, estado: "falta" as const };
          if (ds === hj) return { ds, dia, estado: "pendente" as const };
          return { ds, dia, estado: "futuro" as const };
        });
        const cont = (e: string) => celulas.filter((c) => c.estado === e).length;
        const agendados = celulas.filter((c) => c.estado !== "vazio").length;
        const feitas = cont("cumprido");
        return { bloco: b, celulas, feitas, parciais: cont("parcial"), naos: cont("nao"), faltas: cont("falta"), agendados, adesao: agendados ? Math.round((feitas / agendados) * 100) : 0 };
      });
    const totAgendados = linhas.reduce((s, l) => s + l.agendados, 0);
    const totFeitas = linhas.reduce((s, l) => s + l.feitas, 0);
    return { linhas, totAgendados, totFeitas, pct: totAgendados ? Math.round((totFeitas / totAgendados) * 100) : 0 };
  }, [todos, hist, semana]);

  if (carregando) return <main className="flex min-h-screen items-center justify-center text-slate-400 dark:bg-slate-950 dark:text-slate-500">Carregando…</main>;

  const h = agora.getHours();
  const saudacao = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const dataExtenso = agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const relogio = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const R = 52, C = 2 * Math.PI * R;
  const diaCheio = resumo.horasDia > 12;

  function abrirNoHorario(hhmm: string) { setPrefill({ titulo: "", inboxId: "", hora: hhmm }); }
  const wake = perfil?.hora_acordar ? paraData(perfil.hora_acordar, agora) : null;
  const sleep = perfil?.hora_dormir ? paraData(perfil.hora_dormir, agora) : null;

  const LinhaAgora = () => (
    <div className="relative my-2 flex items-center gap-2 pl-[54px]">
      <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
      <div className="h-0.5 flex-1 bg-red-500/60" />
      <span className="text-[11px] font-bold text-red-500">AGORA {relogio}</span>
    </div>
  );
  const GapRow = ({ de, ate }: { de: Date; ate: Date }) => {
    const min = Math.round((+ate - +de) / 60000);
    const dentro = agora >= de && agora < ate;
    return (
      <div className="relative mb-3 pl-[54px]">
        {dentro && <LinhaAgora />}
        <button onClick={() => abrirNoHorario(hhmmDe(de))}
          className="w-full rounded-xl border border-dashed border-slate-200 py-2 text-xs font-medium text-slate-400 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-500">
          {fmtDur(min)} livre — + adicionar
        </button>
      </div>
    );
  };

  const anelDot = "ring-4 ring-white dark:ring-slate-800";
  const agendaItens: React.ReactNode[] = [];
  if (blocos.length > 0) {
    if (wake) agendaItens.push(
      <div key="wake" className="relative mb-3 flex items-center gap-3">
        <div className="w-10 text-right text-xs font-bold text-slate-400 dark:text-slate-500">{perfil!.hora_acordar}</div>
        <div className={`z-10 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-300 ${anelDot}`} />
        <div className="flex-1 text-sm font-medium text-slate-400 dark:text-slate-500">🌅 Acordar</div>
      </div>);
    let cursor: Date | null = wake;
    blocos.forEach((b) => {
      const i = inicioHoje(b, agora); const f = new Date(i.getTime() + b.duracao_min * 60000);
      if (cursor && +i - +cursor >= 20 * 60000) agendaItens.push(<GapRow key={"g" + b.id} de={cursor} ate={i} />);
      const ativo = agora >= i && agora < f; const cor = b.cor || "#64748b";
      agendaItens.push(
        <div key={b.id} className="relative mb-3 flex items-start gap-3">
          <div className="w-10 pt-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400">{hhmmDe(i)}</div>
          <div className={`z-10 mt-4 h-2.5 w-2.5 shrink-0 rounded-full ${anelDot}`} style={{ backgroundColor: cor }} />
          <button onClick={() => setForm(b)} className="flex flex-1 items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-100 transition active:scale-[0.99] dark:bg-slate-800 dark:ring-slate-700/60"
            style={ativo ? { border: "2px solid #4f46e5" } : { borderLeft: `4px solid ${cor}` }}>
            <SeloAtividade nome={b.icone} cor={cor} size={36} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{b.titulo}</span>
                {ativo ? <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">agora</span> : <Pencil size={14} className="text-slate-300 dark:text-slate-500" />}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{b.duracao_min} min · {b.categoria}</p>
            </div>
          </button>
        </div>);
      cursor = f;
    });
    if (cursor && sleep && +sleep - +cursor >= 20 * 60000) agendaItens.push(<GapRow key="gsleep" de={cursor} ate={sleep} />);
    if (sleep) agendaItens.push(
      <div key="sleep" className="relative flex items-center gap-3">
        <div className="w-10 text-right text-xs font-bold text-slate-400 dark:text-slate-500">{perfil!.hora_dormir}</div>
        <div className={`z-10 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-300 ${anelDot}`} />
        <div className="flex-1 text-sm font-medium text-slate-400 dark:text-slate-500">🌙 Dormir</div>
      </div>);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-xl space-y-5 p-5 pb-28">
        <header className="flex items-start justify-between pt-2">
          <div>
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{relogio}</p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{saudacao}</h1>
            <p className="text-sm capitalize text-slate-500 dark:text-slate-400">{dataExtenso}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={alternarTema} title="Tema" className="rounded-full p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              {tema === "claro" ? <Moon size={22} /> : <Sun size={22} />}
            </button>
            <button onClick={() => setAjustes(true)} className="rounded-full p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><Settings size={22} /></button>
          </div>
        </header>

        {aba === "hoje" && (
          <>
            <section className={CARD}>
              <div className="flex items-center gap-6">
                <div className="relative h-32 w-32 shrink-0">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" className="text-indigo-100 dark:text-slate-700" strokeWidth="12" />
                    <circle cx="60" cy="60" r={R} fill="none" stroke="#6366f1" strokeWidth="12" strokeLinecap="round"
                      strokeDasharray={C} strokeDashoffset={C * (1 - resumo.pct / 100)} style={{ transition: "stroke-dashoffset .6s ease" }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{resumo.pct}%</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">do dia</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-500 dark:text-slate-400">{resumo.total === 0 ? "Nenhum bloco hoje" : `${resumo.total} ${resumo.total === 1 ? "bloco" : "blocos"}`}</p>
                  {resumo.atual ? <p className="font-semibold text-slate-900 dark:text-slate-100">Agora: {resumo.atual.titulo}</p>
                    : resumo.proximo ? <p className="font-semibold text-slate-900 dark:text-slate-100">Próximo: {resumo.proximo.titulo}<span className="block text-sm font-normal text-slate-500 dark:text-slate-400">às {hhmmDe(inicioHoje(resumo.proximo, agora))}</span></p>
                    : <p className="font-semibold text-slate-900 dark:text-slate-100">Dia livre ✨</p>}
                </div>
              </div>
            </section>

            {diaCheio && (
              <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/50">
                Dia bem cheio: {resumo.horasDia.toFixed(1)}h planejadas. Cuidado para não se sobrecarregar.
              </div>
            )}

            <section className="space-y-3">
              {blocos.length === 0 ? (
                <div className="rounded-3xl bg-gradient-to-b from-indigo-50 to-white p-8 text-center shadow-sm ring-1 ring-slate-100 dark:from-slate-800 dark:to-slate-800 dark:ring-slate-700/60">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950">
                    <Sparkles size={30} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{saudacao}! Seu dia está em branco.</p>
                  <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                    Uma folha limpa é uma boa notícia. Que tal desenhar como você quer que ele seja?
                  </p>
                  <button onClick={() => setForm("novo")}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 active:scale-95 dark:shadow-none">
                    <Plus size={18} /> Montar meu dia
                  </button>
                  <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">Sem ideia agora? Anote na captura rápida abaixo e encaixe depois.</p>
                </div>
              ) : blocos.map((b) => {
                const i = inicioHoje(b, agora); const f = new Date(i.getTime() + b.duracao_min * 60000);
                const ativo = agora >= i && agora < f;
                const restante = ativo ? Math.ceil((f.getTime() - agora.getTime()) / 60000) : null;
                const status = execsHoje[b.id]; const cor = b.cor || "#64748b";
                const st = calcStreak(b, feitosPorBloco[b.id] || new Set());
                const subs = b.subtarefas || [];
                return (
                  <div key={b.id} className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition dark:bg-slate-800 ${ativo ? "ring-2 ring-indigo-400" : "ring-slate-100 dark:ring-slate-700/60"}`}>
                    <div className="flex">
                      <div className="w-1.5 shrink-0" style={{ backgroundColor: cor }} />
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <SeloAtividade nome={b.icone} cor={cor} size={40} />
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{b.titulo}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">{hhmmDe(i)} · {b.duracao_min} min {st.atual > 0 && <span className="ml-1 text-orange-500">🔥 {st.atual}</span>}</p>
                            </div>
                          </div>
                          {ativo ? <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">faltam {restante} min</span>
                            : <button onClick={() => setForm(b)} className="text-slate-300 hover:text-slate-600 dark:text-slate-500"><Pencil size={16} /></button>}
                        </div>

                        {subs.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            {subs.map((s, idx) => (
                              <button key={idx} onClick={() => toggleSub(b, idx)} className="flex w-full items-center gap-2 text-left text-sm">
                                <span className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${s.feito ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 dark:border-slate-500"}`}>{s.feito ? "✓" : ""}</span>
                                <span className={s.feito ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-600 dark:text-slate-300"}>{s.texto}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {ativo && (
                          <button onClick={() => setFoco(b)} className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-indigo-50 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300">
                            <Play size={13} /> Entrar em foco
                          </button>
                        )}
                        <div className="mt-3 flex gap-2">
                          {[{ s: "cumprido", txt: "Cumpri", on: "bg-emerald-500 text-white", off: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
                            { s: "parcial", txt: "Em parte", on: "bg-amber-500 text-white", off: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
                            { s: "nao", txt: "Hoje não", on: "bg-slate-400 text-white", off: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" }].map((x) => (
                            <button key={x.s} onClick={() => registrar(b.id, x.s, b.duracao_min)}
                              className={`flex-1 rounded-lg py-2 text-xs font-medium transition active:scale-95 ${status === x.s ? x.on : x.off}`}>{x.txt}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700/60">
              <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">📥 Captura rápida</p>
              <div className="flex gap-2">
                <input value={novoInbox} onChange={(e) => setNovoInbox(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addInbox(); }}
                  placeholder="Anote algo para encaixar depois…"
                  className="flex-1 rounded-lg border-0 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:text-slate-100" />
                <button onClick={addInbox} className="rounded-lg bg-indigo-50 px-3 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">+</button>
              </div>
              {inbox.length > 0 && (
                <div className="mt-3 space-y-2">
                  {inbox.map((it) => (
                    <div key={it.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700">
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{it.texto}</span>
                      <button onClick={() => setPrefill({ titulo: it.texto, inboxId: it.id })} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Agendar</button>
                      <button onClick={() => removerInbox(it.id)} className="text-slate-400">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {blocos.length > 0 && (
              <button onClick={() => setEncerrar(true)}
                className="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-indigo-600 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:text-indigo-400 dark:ring-slate-700/60">
                🌙 Encerrar o dia
              </button>
            )}
          </>
        )}

        {aba === "meudia" && (
          <section className="relative rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700/60">
            <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">Agenda do dia</h2>
            {blocos.length === 0 ? (
              <p className="py-8 text-center text-slate-400 dark:text-slate-500">Nada agendado. Toque no + para começar.</p>
            ) : (
              <div className="relative">
                <div className="absolute bottom-2 left-[58px] top-2 w-0.5 bg-slate-200 dark:bg-slate-700" />
                {agendaItens}
              </div>
            )}
          </section>
        )}

        {aba === "progresso" && (
          <>
            <section className={CARD}>
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-slate-500 dark:text-slate-400">Nível</p><p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{nivel}</p></div>
                <p className="text-sm text-slate-400 dark:text-slate-500">{xpTotal} XP</p>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${pctNivel}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{pctNivel}% para o nível {nivel + 1} · XP vem dos minutos cumpridos</p>
            </section>

            <section className={CARD}>
              <h3 className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Últimos 7 dias</h3>
              <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
                {ultimos7.map((d, k) => (
                  <div key={k} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <div className="w-full rounded-t-md bg-indigo-500" style={{ height: `${Math.max(d.pct, 3)}%`, opacity: d.total ? 1 : 0.2 }} />
                    <span className="text-[10px] capitalize text-slate-400 dark:text-slate-500">{d.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {recorrentes.length > 0 && (
              <section className={CARD}>
                <h3 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Sequências</h3>
                <div className="space-y-2">
                  {recorrentes.map((b) => {
                    const st = calcStreak(b, feitosPorBloco[b.id] || new Set());
                    return (
                      <div key={b.id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200"><SeloAtividade nome={b.icone} cor={b.cor || "#64748b"} size={24} />{b.titulo}</span>
                        <span className="text-slate-500 dark:text-slate-400">🔥 {st.atual} <span className="text-slate-300 dark:text-slate-600">· recorde {st.recorde}</span></span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {porCategoria.length > 0 && (
              <section className={CARD}>
                <h3 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Tempo por categoria (120 dias)</h3>
                <div className="space-y-2">
                  {porCategoria.map(([cat, min]) => (
                    <div key={cat} className="flex items-center gap-2 text-sm">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: CAT_COR[cat] || "#64748b" }} />
                      <span className="flex-1 text-slate-700 dark:text-slate-200">{cat}</span>
                      <span className="text-slate-500 dark:text-slate-400">{Math.round(min / 60)}h {min % 60}min</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {aba === "semana" && (
          <>
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700/60">
              <div className="mb-4 flex items-center justify-between">
                <button onClick={() => setSemanaOffset((o) => o - 1)} className="rounded-lg bg-slate-50 px-3 py-2 text-slate-500 dark:bg-slate-700 dark:text-slate-300"><ChevronLeft size={18} /></button>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {semana[0].toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} – {semana[6].toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{semanaOffset === 0 ? "esta semana" : semanaOffset === -1 ? "semana passada" : ""}</p>
                </div>
                <button onClick={() => setSemanaOffset((o) => o + 1)} className="rounded-lg bg-slate-50 px-3 py-2 text-slate-500 dark:bg-slate-700 dark:text-slate-300"><ChevronRight size={18} /></button>
              </div>

              <div className="mb-4 flex items-center gap-4 rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950/50">
                <span className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{acompanhamento.pct}%</span>
                <span className="text-sm text-indigo-900 dark:text-indigo-200">{acompanhamento.totFeitas} de {acompanhamento.totAgendados} cumpridas na semana</span>
              </div>

              {acompanhamento.linhas.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Nenhuma atividade que se repete nesta semana.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-1 pl-[96px] text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                    {semana.map((d, k) => (
                      <div key={k} className="flex-1 text-center">{["S", "T", "Q", "Q", "S", "S", "D"][k]}<br />{d.getDate()}</div>
                    ))}
                  </div>
                  {acompanhamento.linhas.map((l) => (
                    <div key={l.bloco.id} className="flex items-center gap-1">
                      <div className="w-[92px] truncate pr-1 text-xs font-medium text-slate-700 dark:text-slate-200">{l.bloco.titulo}</div>
                      {l.celulas.map((c, k) => {
                        const cls =
                          c.estado === "cumprido" ? "bg-emerald-500 text-white"
                          : c.estado === "parcial" ? "bg-amber-400 text-white"
                          : c.estado === "nao" ? "bg-slate-300 text-white dark:bg-slate-600"
                          : c.estado === "falta" ? "bg-red-100 text-red-400 dark:bg-red-950/50"
                          : c.estado === "pendente" ? "border border-dashed border-indigo-300 text-indigo-300"
                          : c.estado === "futuro" ? "border border-slate-200 text-slate-300 dark:border-slate-600 dark:text-slate-600"
                          : "opacity-0";
                        const sym = c.estado === "cumprido" ? "✓" : c.estado === "parcial" ? "◐" : c.estado === "nao" ? "✕" : c.estado === "falta" ? "!" : "";
                        const podeTocar = c.estado !== "vazio" && c.estado !== "futuro";
                        return (
                          <button key={k} disabled={!podeTocar} onClick={() => toggleDiaCheck(l.bloco, c.dia)}
                            className={`flex h-8 flex-1 items-center justify-center rounded-md text-xs font-bold transition active:scale-90 ${cls}`}>{sym}</button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">Toque numa célula para marcar/desmarcar como feita. ✓ feito · ◐ em parte · ✕ não · ! falta</p>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700/60">
              <h3 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Por atividade</h3>
              {acompanhamento.linhas.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">Sem dados nesta semana.</p>
              ) : (
                <div className="space-y-3">
                  {acompanhamento.linhas.map((l) => (
                    <div key={l.bloco.id}>
                      <button onClick={() => setForm(l.bloco)} className="mb-1 flex w-full items-center justify-between text-left text-sm">
                        <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200"><SeloAtividade nome={l.bloco.icone} cor={l.bloco.cor || "#64748b"} size={26} />{l.bloco.titulo}</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{l.adesao}%</span>
                      </button>
                      <div className="mb-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${l.adesao}%` }} />
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        ✓ {l.feitas} feitas · ◐ {l.parciais} · ✕ {l.naos} · ! {l.faltas} faltas · {l.agendados} agendadas
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <button onClick={() => setForm("novo")}
        className="fixed bottom-24 right-1/2 z-40 flex h-14 w-14 translate-x-[170px] items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-300 transition active:scale-95 dark:shadow-none"><Plus size={28} /></button>

      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-200 bg-white/90 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <button onClick={() => setAba("hoje")} className={`flex flex-1 flex-col items-center gap-1 text-xs font-medium ${aba === "hoje" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`}><IcHome size={20} />Hoje</button>
        <button onClick={() => setAba("meudia")} className={`flex flex-1 flex-col items-center gap-1 text-xs font-medium ${aba === "meudia" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`}><CalendarDays size={20} />Meu dia</button>
        <button onClick={() => setAba("progresso")} className={`flex flex-1 flex-col items-center gap-1 text-xs font-medium ${aba === "progresso" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`}><TrendingUp size={20} />Progresso</button>
        <button onClick={() => setAba("semana")} className={`flex flex-1 flex-col items-center gap-1 text-xs font-medium ${aba === "semana" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`}><BarChart3 size={20} />Acompanhar</button>
      </nav>

      {form && <TaskForm bloco={form === "novo" ? null : form} onFechar={() => setForm(null)} onSalvo={() => { setForm(null); carregar(); }} />}
      {prefill && (
        <TaskForm bloco={null} tituloInicial={prefill.titulo} horaInicial={prefill.hora}
          onFechar={() => setPrefill(null)}
          onSalvo={async () => { if (prefill.inboxId) await removerInbox(prefill.inboxId); setPrefill(null); carregar(); }} />
      )}
      {foco && <FocusMode titulo={foco.titulo} duracaoMin={foco.duracao_min} onFechar={() => setFoco(null)} />}
      {encerrar && <ShutdownRitual total={resumo.total} feitos={resumo.feitos} onFechar={() => setEncerrar(false)} />}
      {((perfil && (!perfil.hora_acordar || !perfil.hora_dormir)) || editarHorarios) && (
        <HorariosForm acordar={perfil?.hora_acordar || ""} dormir={perfil?.hora_dormir || ""} primeiraVez={!editarHorarios}
          onFechar={() => setEditarHorarios(false)} onSalvo={() => { setEditarHorarios(false); carregar(); }} />
      )}

      {ajustes && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center" onClick={() => setAjustes(false)}>
          <div className="w-full max-w-md space-y-5 rounded-t-3xl bg-white p-6 dark:bg-slate-800 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Ajustes</h2>
              <button onClick={() => setAjustes(false)} className="text-slate-400">✕</button>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Aparência</p>
              <button onClick={alternarTema} className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-700">
                <span className="text-slate-600 dark:text-slate-300">Tema</span>
                <span className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                  {tema === "claro" ? <><Sun size={16} /> Claro</> : <><Moon size={16} /> Escuro</>}
                </span>
              </button>
            </div>
            <div><p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Notificações</p><PushManager /></div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Seu dia</p>
              <button onClick={() => { setAjustes(false); setEditarHorarios(true); }}
                className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-700">
                <span className="text-slate-600 dark:text-slate-300">Acordar / dormir</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">🌅 {perfil?.hora_acordar || "—"} · 🌙 {perfil?.hora_dormir || "—"}</span>
              </button>
            </div>
            <button onClick={async () => { const s = criarClienteBrowser(); await s.auth.signOut(); router.push("/login"); }}
              className="w-full rounded-xl bg-slate-100 px-4 py-3 font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">Sair</button>
          </div>
        </div>
      )}
    </main>
  );
}
