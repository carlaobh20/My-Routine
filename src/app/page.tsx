"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { criarClienteBrowser } from "@/lib/supabase/client";
import TaskForm from "@/components/TaskForm";
import PushManager from "@/components/PushManager";

type Bloco = {
  id: string; titulo: string; hora_inicio: string; duracao_min: number;
  categoria: string | null; cor: string | null;
};

function dataLocal(d = new Date()) {
  const o = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return o.toISOString().slice(0, 10);
}

export default function Home() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [agora, setAgora] = useState(new Date());
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [execs, setExecs] = useState<Record<string, string>>({});
  const [mostrarForm, setMostrarForm] = useState(false);

  async function carregar() {
    const supabase = criarClienteBrowser();
    const hoje = dataLocal();
    const { data: bs } = await supabase
      .from("blocks").select("id,titulo,hora_inicio,duracao_min,categoria,cor")
      .eq("data", hoje).order("hora_inicio");
    const { data: es } = await supabase
      .from("executions").select("block_id,status");
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

  async function registrar(blockId: string, status: string, min: number) {
    const supabase = criarClienteBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const minutos = status === "cumprido" ? min : status === "parcial" ? Math.round(min / 2) : 0;
    await supabase.from("executions").upsert(
      { block_id: blockId, user_id: user.id, status, minutos_cumpridos: minutos },
      { onConflict: "block_id" },
    );
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
    const proximo = blocos.find((b) => new Date(b.hora_inicio) > agora);
    const atual = blocos.find((b) => {
      const i = new Date(b.hora_inicio);
      const f = new Date(i.getTime() + b.duracao_min * 60000);
      return agora >= i && agora < f;
    });
    return { total, pct, proximo, atual };
  }, [blocos, execs, agora]);

  if (carregando) {
    return <main className="flex min-h-screen items-center justify-center text-slate-400">Carregando…</main>;
  }

  const hora = agora.getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const dataExtenso = agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const relogio = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const R = 52, C = 2 * Math.PI * R;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="mx-auto max-w-xl space-y-5 p-5 pb-24">
        {/* Cabeçalho */}
        <header className="flex items-start justify-between pt-2">
          <div>
            <p className="text-sm font-medium text-indigo-600">{relogio}</p>
            <h1 className="text-2xl font-bold text-slate-900">{saudacao}</h1>
            <p className="text-sm capitalize text-slate-500">{dataExtenso}</p>
          </div>
          <button
            onClick={async () => {
              const supabase = criarClienteBrowser();
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="text-sm text-slate-400 hover:text-slate-700"
          >
            Sair
          </button>
        </header>

        {/* Resumo do dia */}
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-6">
            <div className="relative h-32 w-32 shrink-0">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r={R} fill="none" stroke="#eef2ff" strokeWidth="12" />
                <circle
                  cx="60" cy="60" r={R} fill="none" stroke="#4f46e5" strokeWidth="12"
                  strokeLinecap="round" strokeDasharray={C}
                  strokeDashoffset={C * (1 - resumo.pct / 100)}
                  style={{ transition: "stroke-dashoffset 0.6s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-900">{resumo.pct}%</span>
                <span className="text-xs text-slate-400">do dia</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-500">
                {resumo.total === 0 ? "Nenhum bloco hoje" : `${resumo.total} ${resumo.total === 1 ? "bloco" : "blocos"} planejados`}
              </p>
              {resumo.atual ? (
                <p className="font-semibold text-slate-900">Agora: {resumo.atual.titulo}</p>
              ) : resumo.proximo ? (
                <p className="font-semibold text-slate-900">
                  Próximo: {resumo.proximo.titulo}
                  <span className="block text-sm font-normal text-slate-500">
                    às {new Date(resumo.proximo.hora_inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </p>
              ) : (
                <p className="font-semibold text-slate-900">Dia livre por aqui ✨</p>
              )}
            </div>
          </div>
        </section>

        <PushManager />

        {/* Botão adicionar */}
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="w-full rounded-2xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600"
        >
          {mostrarForm ? "Fechar" : "+ Adicionar bloco"}
        </button>
        {mostrarForm && <TaskForm onCriado={() => { carregar(); setMostrarForm(false); }} />}

        {/* Lista do dia */}
        <section className="space-y-3">
          {blocos.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
              <p className="text-slate-500">Seu dia está vazio.</p>
              <p className="mt-1 text-sm text-slate-400">Toque em “Adicionar bloco” para montar sua rotina.</p>
            </div>
          ) : (
            blocos.map((b) => {
              const inicio = new Date(b.hora_inicio);
              const fim = new Date(inicio.getTime() + b.duracao_min * 60000);
              const ativo = agora >= inicio && agora < fim;
              const restante = ativo ? Math.ceil((fim.getTime() - agora.getTime()) / 60000) : null;
              const status = execs[b.id];
              const cor = b.cor || "#64748b";
              return (
                <div
                  key={b.id}
                  className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition ${ativo ? "ring-2 ring-indigo-400" : "ring-slate-100"}`}
                >
                  <div className="flex">
                    <div className="w-1.5 shrink-0" style={{ backgroundColor: cor }} />
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{b.titulo}</p>
                          <p className="text-sm text-slate-500">
                            {inicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {b.duracao_min} min
                          </p>
                        </div>
                        {ativo ? (
                          <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                            faltam {restante} min
                          </span>
                        ) : (
                          <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: cor + "22", color: cor }}>
                            {b.categoria}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex gap-2">
                        {[
                          { s: "cumprido", txt: "Cumpri", on: "bg-emerald-500 text-white", off: "bg-emerald-50 text-emerald-700" },
                          { s: "parcial", txt: "Em parte", on: "bg-amber-500 text-white", off: "bg-amber-50 text-amber-700" },
                          { s: "nao", txt: "Hoje não", on: "bg-slate-400 text-white", off: "bg-slate-100 text-slate-600" },
                        ].map((b2) => (
                          <button
                            key={b2.s}
                            onClick={() => registrar(b.id, b2.s, b.duracao_min)}
                            className={`flex-1 rounded-lg py-2 text-xs font-medium transition active:scale-95 ${status === b2.s ? b2.on : b2.off}`}
                          >
                            {b2.txt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
