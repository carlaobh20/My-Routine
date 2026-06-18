"use client";

import { useEffect, useState } from "react";
import { ativarNotificacoes, testarNotificacaoLocal, ehIOS, estaInstalado } from "@/lib/push";

export default function PushManager() {
  const [iosNaoInstalado, setIosNaoInstalado] = useState(false);
  const [status, setStatus] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => { setIosNaoInstalado(ehIOS() && !estaInstalado()); }, []);

  if (iosNaoInstalado) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
        <p className="font-semibold">Antes de tudo: instale na tela inicial</p>
        <p className="mt-1">No iPhone, as notificações só funcionam com o app instalado. Toque em <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong> e abra pelo ícone.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button disabled={ocupado}
          onClick={async () => { setOcupado(true); setStatus(""); const r = await ativarNotificacoes(); setStatus(r.msg); setOcupado(false); }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
          Ativar notificações
        </button>
        <button disabled={ocupado}
          onClick={async () => { setOcupado(true); setStatus(""); const r = await testarNotificacaoLocal(); setStatus(r.msg); setOcupado(false); }}
          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200">
          Testar agora
        </button>
      </div>
      {status && <p className="text-sm text-slate-600 dark:text-slate-300">{status}</p>}
    </div>
  );
}
