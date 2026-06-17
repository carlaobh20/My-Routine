"use client";

import { useEffect, useState } from "react";
import { ativarNotificacoes, ehIOS, estaInstalado } from "@/lib/push";

export default function PushManager() {
  const [iosNaoInstalado, setIosNaoInstalado] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setIosNaoInstalado(ehIOS() && !estaInstalado());
  }, []);

  if (iosNaoInstalado) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Antes de tudo: instale na tela inicial</p>
        <p className="mt-1">
          No iPhone, as notificações só funcionam com o app instalado. Toque em{" "}
          <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong> e abra o app
          a partir do ícone.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={async () => {
          const r = await ativarNotificacoes();
          setStatus(r.msg);
        }}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Ativar notificações
      </button>
      {status && <span className="text-sm text-slate-600">{status}</span>}
    </div>
  );
}
