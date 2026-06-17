"use client";

import { useEffect, useState } from "react";
import { criarClienteBrowser } from "@/lib/supabase/client";

type Bloco = {
  id: string; titulo: string; hora_inicio: string; duracao_min: number;
};

export default function Timeline({ atualizar }: { atualizar: number }) {
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [agora, setAgora] = useState(new Date());

  async function carregar() {
    const supabase = criarClienteBrowser();
    const hoje = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("blocks").select("id, titulo, hora_inicio, duracao_min")
      .eq("data", hoje).order("hora_inicio");
    setBlocos(data ?? []);
  }

  useEffect(() => { carregar(); }, [atualizar]);
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  async function registrar(blockId: string, status: "cumprido" | "parcial" | "nao", min: number) {
    const supabase = criarClienteBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("executions").upsert(
      { block_id: blockId, user_id: user.id, status, minutos_cumpridos: status === "cumprido" ? min : status === "parcial" ? Math.round(min / 2) : 0 },
      { onConflict: "block_id" },
    );
    carregar();
  }

  if (!blocos.length) {
    return <p className="text-slate-500">Nenhum bloco hoje. Adicione o primeiro acima.</p>;
  }

  return (
    <ul className="space-y-2">
      {blocos.map((b) => {
        const inicio = new Date(b.hora_inicio);
        const fim = new Date(inicio.getTime() + b.duracao_min * 60000);
        const ativo = agora >= inicio && agora < fim;
        const restante = ativo ? Math.ceil((fim.getTime() - agora.getTime()) / 60000) : null;
        return (
          <li
            key={b.id}
            className={`rounded-xl border p-4 ${ativo ? "border-indigo-500 bg-indigo-50" : "border-slate-200"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{b.titulo}</span>
                <span className="ml-2 text-sm text-slate-500">
                  {inicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {b.duracao_min} min
                </span>
              </div>
              {ativo && (
                <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                  faltam {restante} min
                </span>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => registrar(b.id, "cumprido", b.duracao_min)} className="rounded-md bg-emerald-100 px-3 py-1 text-xs text-emerald-800">Cumpri</button>
              <button onClick={() => registrar(b.id, "parcial", b.duracao_min)} className="rounded-md bg-amber-100 px-3 py-1 text-xs text-amber-800">Em parte</button>
              <button onClick={() => registrar(b.id, "nao", b.duracao_min)} className="rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-700">Hoje não</button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
