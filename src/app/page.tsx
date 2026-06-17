"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { criarClienteBrowser } from "@/lib/supabase/client";
import TaskForm, { BlocoEdit } from "@/components/TaskForm";
import PushManager from "@/components/PushManager";

type Bloco = BlocoEdit;

function dataLocal(d = new Date()) {
  const o = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return o.toISOString().slice(0, 10);
}
function hhmm(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function Home() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [agora, setAgora] = useState(new Date());
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [execs, setExecs] = useState<Record<string, string>>({});
  const [aba, setAba] = useState<"hoje" | "meudia">("hoje");
  const [form, setForm] = useState<null | "novo" | Bloco>(null);
  const [ajustes, setAjustes] = useState(false);

  async function carregar() {
    const supabase = criarClienteBrowser();
    const { data: bs } = await supabase
      .from("blocks").select("id,titulo,hora_inicio,duracao_min,categoria,cor,gatilho,validade_tipo,validade_ate")
      .eq("data", dataLocal()).order("hora_inicio");
    const { data: es } = await supabase.from("executions").select("block_id,status");
    const mapa: Record<string, string> = {};
    (es ?? []).forEach((e: { block_id: string; status: string }) => { mapa[e.block_id] = e.status; });
    setBlocos(bs ?? []);
    setExecs(mapa);
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

  async function registrar(id: string, status: string, min: number) {
    const supabase = criarClienteBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const minutos = status === "cumprido" ? min : status === "parcial" ? Math.round(min / 2) : 0;
    await supabase.from("executions").upsert(
      { block_id: id, user_id: user.id, status, minutos_cumpridos: minutos }, { onConflict: "block_id" });
    carregar();
  }

  const resumo = useMemo(() => {
    const total = blocos.length;
    let pontos = 0;
    blocos.forEach((b) => {
      if (execs[b.id] === "cumprido") pontos += 1;
      else if (execs[b.id] === "parcial") pontos += 0.5;
    });
    const pct = total ? Math.round((pontos / total) * 100) : 0;
    const atual = blocos.find((b) => {
      const i = new Date(b.hora_inicio); const f = new Date(i.getTime() + b.duracao_min * 60000);
      return agora >= i && agora < f;
    });
    const proximo = blocos.find((b) => new Date(b.hora_inicio) > agora);
    return { total, pct, atual, proximo };
  }, [blocos, execs, agora]);

  if (carregando) return <main className="flex min-h-screen items-center justify-center text-slate-400">Carregando…</main>;

  const h = agora.getHours();
  const saudacao = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const dataExtenso = agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const relogio = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const R = 52, C = 2 * Math.PI * R;

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

        {aba === "hoje" ? (
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
                    : resumo.proximo ? <p className="font-semibold text-slate-900">Próximo: {resumo.proximo.titulo}<span className="block text-sm font-normal text-slate-500">às {hhmm(resumo.proximo.hora_inicio)}</span></p>
                    : <p className="font-semibold text-slate-900">Dia livre ✨</p>}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              {blocos.length === 0 ? (
                <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
                  <p className="text-slate-500">Seu dia está vazio.</p>
                  <p className="mt-1 text-sm text-slate-400">Toque no + para montar sua rotina.</p>
                </div>
              ) : blocos.map((b) => {
                const i = new Date(b.hora_inicio); const f = new Date(i.getTime() + b.duracao_min * 60000);
                const ativo = agora >= i && agora < f;
                const restante = ativo ? Math.ceil((f.getTime() - agora.getTime()) / 60000) : null;
                const status = execs[b.id]; const cor = b.cor || "#64748b";
                return (
                  <div key={b.id} className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition ${ativo ? "ring-2 ring-indigo-400" : "ring-slate-100"}`}>
                    <div className="flex">
                      <div className="w-1.5 shrink-0" style={{ backgroundColor: cor }} />
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between">
                          <div><p className="font-semibold text-slate-900">{b.titulo}</p>
                            <p className="text-sm text-slate-500">{hhmm(b.hora_inicio)} · {b.duracao_min} min</p></div>
                          {ativo ? <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">faltam {restante} min</span>
                            : <button onClick={() => setForm(b)} className="text-slate-300 hover:text-slate-600">✎</button>}
                        </div>
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
          </>
        ) : (
          <section className="relative rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Agenda do dia</h2>
            {blocos.length === 0 ? (
              <p className="py-8 text-center text-slate-400">Nada agendado. Toque no + para começar.</p>
            ) : (
              <div className="relative">
                <div className="absolute bottom-2 left-[58px] top-2 w-0.5 bg-slate-200" />
                {blocos.map((b) => {
                  const i = new Date(b.hora_inicio); const f = new Date(i.getTime() + b.duracao_min * 60000);
                  const ativo = agora >= i && agora < f; const cor = b.cor || "#64748b";
                  return (
                    <div key={b.id} className="relative mb-3 flex items-start gap-3">
                      <div className="w-10 pt-3 text-right text-xs font-bold text-slate-500">{hhmm(b.hora_inicio)}</div>
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
                  );
                })}
              </div>
            )}
          </section>
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
      </nav>

      {form && <TaskForm bloco={form === "novo" ? null : form} onFechar={() => setForm(null)} onSalvo={() => { setForm(null); carregar(); }} />}

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
            <button onClick={async () => { const s = criarClienteBrowser(); await s.auth.signOut(); router.push("/login"); }}
              className="w-full rounded-xl bg-slate-100 px-4 py-3 font-medium text-slate-600">Sair</button>
          </div>
        </div>
      )}
    </main>
  );
}
