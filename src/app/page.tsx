"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { criarClienteBrowser } from "@/lib/supabase/client";
import TaskForm, { BlocoEdit } from "@/components/TaskForm";
import PushManager from "@/components/PushManager";
import FocusMode from "@/components/FocusMode";
import ShutdownRitual from "@/components/ShutdownRitual";
import HorariosForm from "@/components/HorariosForm";

type Bloco = BlocoEdit;
type ExecHist = { block_id: string; status: string; data: string; minutos_cumpridos: number };

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
function hhmmDe(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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
  const hoje = new Date();
  const hojeStr = dataLocal(hoje);
  let atual = 0;
  for (let d = 0; d < 120; d++) {
    const dia = new Date(hoje); dia.setDate(hoje.getDate() - d);
    const ds = dataLocal(dia);
    if (b.data && ds < b.data) break;
    if (!b.dias_semana.includes(dia.getDay())) continue;
    if (feitos.has(ds)) atual++;
    else if (ds === hojeStr) continue; // hoje ainda não feito não quebra
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
    else if (ds === hojeStr) { /* hoje pendente */ }
    else { run = 0; }
  }
  return { atual, recorde: Math.max(recorde, atual) };
}

export default function Home() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [agora, setAgora] = useState(new Date());
  const [todos, setTodos] = useState<Bloco[]>([]);
  const [hist, setHist] = useState<ExecHist[]>([]);
  const [aba, setAba] = useState<"hoje" | "meudia" | "progresso">("hoje");
  const [form, setForm] = useState<null | "novo" | Bloco>(null);
  const [ajustes, setAjustes] = useState(false);
  const [foco, setFoco] = useState<Bloco | null>(null);
  const [encerrar, setEncerrar] = useState(false);
  const [perfil, setPerfil] = useState<{ hora_acordar: string | null; hora_dormir: string | null } | null>(null);
  const [editarHorarios, setEditarHorarios] = useState(false);

  async function carregar() {
    const supabase = criarClienteBrowser();
    const { data: bs } = await supabase
      .from("blocks")
      .select("id,titulo,hora_inicio,duracao_min,categoria,cor,data,gatilho,validade_tipo,validade_ate,dias_semana");
    const desde = dataLocal(new Date(Date.now() - 120 * 86400000));
    const { data: hs } = await supabase
      .from("executions").select("block_id,status,data,minutos_cumpridos").gte("data", desde);
    const { data: prof } = await supabase
      .from("profiles").select("hora_acordar,hora_dormir").maybeSingle();
    setTodos(bs ?? []);
    setHist((hs ?? []) as ExecHist[]);
    setPerfil(prof ?? { hora_acordar: null, hora_dormir: null });
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

  const recorrentes = useMemo(
    () => todos.filter((b) => b.dias_semana && b.dias_semana.length > 0),
    [todos],
  );

  if (carregando) return <main className="flex min-h-screen items-center justify-center text-slate-400">Carregando…</main>;

  const h = agora.getHours();
  const saudacao = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const dataExtenso = agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const relogio = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const R = 52, C = 2 * Math.PI * R;
  const idxProximo = blocos.findIndex((b) => inicioHoje(b, agora) > agora);
  const diaCheio = resumo.horasDia > 12;

  const LinhaAgora = () => (
    <div className="relative my-2 flex items-center gap-2 pl-[54px]">
      <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
      <div className="h-0.5 flex-1 bg-red-500/60" />
      <span className="text-[11px] font-bold text-red-500">AGORA {relogio}</span>
    </div>
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="mx-auto max-w-xl space-y-5 p-5 pb-28">
        <header className="flex items-start justify-between pt-2">
          <div>
            <p className="text-sm font-medium text-indigo-600">{relogio}</p>
            <h1 className="text-2xl font-bold text-slate-900">{saudacao}</h1>
            <p className="text-sm capitalize text-slate-500">{dataExtenso}</p>
          </div>
          <button onClick={() => setAjustes(true)} className="text-2xl text-slate-400 hover:text-slate-700">⚙</button>
        </header>

        {aba === "hoje" && (
          <>
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center gap-6">
                <div className="relative h-32 w-32 shrink-0">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle cx="60" cy="60" r={R} fill="none" stroke="#eef2ff" strokeWidth="12" />
                    <circle cx="60" cy="60" r={R} fill="none" stroke="#4f46e5" strokeWidth="12" strokeLinecap="round"
                      strokeDasharray={C} strokeDashoffset={C * (1 - resumo.pct / 100)} style={{ transition: "stroke-dashoffset .6s ease" }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-slate-900">{resumo.pct}%</span>
                    <span className="text-xs text-slate-400">do dia</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">{resumo.total === 0 ? "Nenhum bloco hoje" : `${resumo.total} ${resumo.total === 1 ? "bloco" : "blocos"}`}</p>
                  {resumo.atual ? <p className="font-semibold text-slate-900">Agora: {resumo.atual.titulo}</p>
                    : resumo.proximo ? <p className="font-semibold text-slate-900">Próximo: {resumo.proximo.titulo}<span className="block text-sm font-normal text-slate-500">às {hhmmDe(inicioHoje(resumo.proximo, agora))}</span></p>
                    : <p className="font-semibold text-slate-900">Dia livre ✨</p>}
                </div>
              </div>
            </section>

            {diaCheio && (
              <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
                Dia bem cheio: {resumo.horasDia.toFixed(1)}h planejadas. Cuidado para não se sobrecarregar.
              </div>
            )}

            <section className="space-y-3">
              {blocos.length === 0 ? (
                <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
                  <p className="text-slate-500">Seu dia está vazio.</p>
                  <p className="mt-1 text-sm text-slate-400">Toque no + para montar sua rotina.</p>
                </div>
              ) : blocos.map((b) => {
                const i = inicioHoje(b, agora); const f = new Date(i.getTime() + b.duracao_min * 60000);
                const ativo = agora >= i && agora < f;
                const restante = ativo ? Math.ceil((f.getTime() - agora.getTime()) / 60000) : null;
                const status = execsHoje[b.id]; const cor = b.cor || "#64748b";
                const st = calcStreak(b, feitosPorBloco[b.id] || new Set());
                return (
                  <div key={b.id} className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition ${ativo ? "ring-2 ring-indigo-400" : "ring-slate-100"}`}>
                    <div className="flex">
                      <div className="w-1.5 shrink-0" style={{ backgroundColor: cor }} />
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{b.titulo}</p>
                            <p className="text-sm text-slate-500">{hhmmDe(i)} · {b.duracao_min} min {st.atual > 0 && <span className="ml-1 text-orange-500">🔥 {st.atual}</span>}</p>
                          </div>
                          {ativo ? <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">faltam {restante} min</span>
                            : <button onClick={() => setForm(b)} className="text-slate-300 hover:text-slate-600">✎</button>}
                        </div>
                        {ativo && (
                          <button onClick={() => setFoco(b)} className="mt-3 w-full rounded-lg bg-indigo-50 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100">
                            ▶ Entrar em foco
                          </button>
                        )}
                        <div className="mt-3 flex gap-2">
                          {[{ s: "cumprido", txt: "Cumpri", on: "bg-emerald-500 text-white", off: "bg-emerald-50 text-emerald-700" },
                            { s: "parcial", txt: "Em parte", on: "bg-amber-500 text-white", off: "bg-amber-50 text-amber-700" },
                            { s: "nao", txt: "Hoje não", on: "bg-slate-400 text-white", off: "bg-slate-100 text-slate-600" }].map((x) => (
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

            {blocos.length > 0 && (
              <button onClick={() => setEncerrar(true)}
                className="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-indigo-600 shadow-sm ring-1 ring-slate-100">
                🌙 Encerrar o dia
              </button>
            )}
          </>
        )}

        {aba === "meudia" && (
          <section className="relative rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Agenda do dia</h2>
            {blocos.length === 0 ? (
              <p className="py-8 text-center text-slate-400">Nada agendado. Toque no + para começar.</p>
            ) : (
              <div className="relative">
                <div className="absolute bottom-2 left-[58px] top-2 w-0.5 bg-slate-200" />
                {perfil?.hora_acordar && (
                  <div className="relative mb-3 flex items-center gap-3">
                    <div className="w-10 text-right text-xs font-bold text-slate-400">{perfil.hora_acordar}</div>
                    <div className="z-10 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-300 ring-4 ring-white" />
                    <div className="flex-1 text-sm font-medium text-slate-400">🌅 Acordar</div>
                  </div>
                )}
                {blocos.map((b, idx) => {
                  const i = inicioHoje(b, agora); const f = new Date(i.getTime() + b.duracao_min * 60000);
                  const ativo = agora >= i && agora < f; const cor = b.cor || "#64748b";
                  return (
                    <div key={b.id}>
                      {idx === idxProximo && <LinhaAgora />}
                      <div className="relative mb-3 flex items-start gap-3">
                        <div className="w-10 pt-3 text-right text-xs font-bold text-slate-500">{hhmmDe(i)}</div>
                        <div className="z-10 mt-4 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white" style={{ backgroundColor: cor }} />
                        <button onClick={() => setForm(b)} className="flex-1 rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-100 transition active:scale-[0.99]"
                          style={ativo ? { border: "2px solid #4f46e5" } : { borderLeft: `4px solid ${cor}` }}>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">{b.titulo}</span>
                            {ativo ? <span className="text-xs font-bold text-indigo-600">agora</span> : <span className="text-slate-300">✎</span>}
                          </div>
                          <p className="text-xs text-slate-500">{b.duracao_min} min · {b.categoria}</p>
                        </button>
                      </div>
                    </div>
                  );
                })}
                {idxProximo === -1 && <LinhaAgora />}
                {perfil?.hora_dormir && (
                  <div className="relative flex items-center gap-3">
                    <div className="w-10 text-right text-xs font-bold text-slate-400">{perfil.hora_dormir}</div>
                    <div className="z-10 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-300 ring-4 ring-white" />
                    <div className="flex-1 text-sm font-medium text-slate-400">🌙 Dormir</div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {aba === "progresso" && (
          <>
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Nível</p>
                  <p className="text-3xl font-bold text-slate-900">{nivel}</p>
                </div>
                <p className="text-sm text-slate-400">{xpTotal} XP</p>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${pctNivel}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{pctNivel}% para o nível {nivel + 1} · XP vem dos minutos cumpridos</p>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <h3 className="mb-4 text-sm font-semibold text-slate-600">Últimos 7 dias</h3>
              <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
                {ultimos7.map((d, k) => (
                  <div key={k} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <div className="w-full rounded-t-md bg-indigo-500" style={{ height: `${Math.max(d.pct, 3)}%`, opacity: d.total ? 1 : 0.2 }} />
                    <span className="text-[10px] capitalize text-slate-400">{d.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {recorrentes.length > 0 && (
              <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <h3 className="mb-3 text-sm font-semibold text-slate-600">Sequências</h3>
                <div className="space-y-2">
                  {recorrentes.map((b) => {
                    const st = calcStreak(b, feitosPorBloco[b.id] || new Set());
                    return (
                      <div key={b.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{b.titulo}</span>
                        <span className="text-slate-500">🔥 {st.atual} <span className="text-slate-300">· recorde {st.recorde}</span></span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {porCategoria.length > 0 && (
              <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <h3 className="mb-3 text-sm font-semibold text-slate-600">Tempo por categoria (120 dias)</h3>
                <div className="space-y-2">
                  {porCategoria.map(([cat, min]) => (
                    <div key={cat} className="flex items-center gap-2 text-sm">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: CAT_COR[cat] || "#64748b" }} />
                      <span className="flex-1 text-slate-700">{cat}</span>
                      <span className="text-slate-500">{Math.round(min / 60)}h {min % 60}min</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <button onClick={() => setForm("novo")}
        className="fixed bottom-24 right-1/2 z-40 flex h-14 w-14 translate-x-[170px] items-center justify-center rounded-full bg-indigo-600 text-3xl text-white shadow-lg shadow-indigo-300 transition active:scale-95">+</button>

      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-200 bg-white/90 py-3 backdrop-blur">
        <button onClick={() => setAba("hoje")} className={`flex-1 text-center text-xs font-medium ${aba === "hoje" ? "text-indigo-600" : "text-slate-400"}`}>
          <div className="text-lg">◴</div>Hoje
        </button>
        <button onClick={() => setAba("meudia")} className={`flex-1 text-center text-xs font-medium ${aba === "meudia" ? "text-indigo-600" : "text-slate-400"}`}>
          <div className="text-lg">▤</div>Meu dia
        </button>
        <button onClick={() => setAba("progresso")} className={`flex-1 text-center text-xs font-medium ${aba === "progresso" ? "text-indigo-600" : "text-slate-400"}`}>
          <div className="text-lg">📈</div>Progresso
        </button>
      </nav>

      {form && <TaskForm bloco={form === "novo" ? null : form} onFechar={() => setForm(null)} onSalvo={() => { setForm(null); carregar(); }} />}
      {foco && <FocusMode titulo={foco.titulo} duracaoMin={foco.duracao_min} onFechar={() => setFoco(null)} />}
      {encerrar && <ShutdownRitual total={resumo.total} feitos={resumo.feitos} onFechar={() => setEncerrar(false)} />}
      {((perfil && (!perfil.hora_acordar || !perfil.hora_dormir)) || editarHorarios) && (
        <HorariosForm
          acordar={perfil?.hora_acordar || ""}
          dormir={perfil?.hora_dormir || ""}
          primeiraVez={!editarHorarios}
          onFechar={() => setEditarHorarios(false)}
          onSalvo={() => { setEditarHorarios(false); carregar(); }}
        />
      )}

      {ajustes && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={() => setAjustes(false)}>
          <div className="w-full max-w-md space-y-5 rounded-t-3xl bg-white p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Ajustes</h2>
              <button onClick={() => setAjustes(false)} className="text-slate-400">✕</button>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-600">Notificações</p>
              <PushManager />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-600">Seu dia</p>
              <button onClick={() => { setAjustes(false); setEditarHorarios(true); }}
                className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <span className="text-slate-600">Acordar / dormir</span>
                <span className="font-medium text-slate-900">🌅 {perfil?.hora_acordar || "—"} · 🌙 {perfil?.hora_dormir || "—"}</span>
              </button>
            </div>
            <button onClick={async () => { const s = criarClienteBrowser(); await s.auth.signOut(); router.push("/login"); }}
              className="w-full rounded-xl bg-slate-100 px-4 py-3 font-medium text-slate-600">Sair</button>
          </div>
        </div>
      )}
    </main>
  );
}
