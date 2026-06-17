"use client";

import { useEffect, useState } from "react";

export default function FocusMode({
  titulo, duracaoMin, onFechar,
}: { titulo: string; duracaoMin: number; onFechar: () => void }) {
  const [seg, setSeg] = useState(duracaoMin * 60);
  const [rodando, setRodando] = useState(true);

  useEffect(() => {
    if (!rodando) return;
    const t = setInterval(() => setSeg((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [rodando]);

  const mm = String(Math.floor(seg / 60)).padStart(2, "0");
  const ss = String(seg % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-indigo-600 px-8 text-white">
      <p className="text-sm uppercase tracking-[0.3em] text-indigo-200">Foco</p>
      <h2 className="mt-3 text-center text-2xl font-bold">{titulo}</h2>
      <div className="my-12 text-7xl font-bold tabular-nums">{mm}:{ss}</div>
      {seg === 0 && <p className="mb-6 text-indigo-100">Tempo! Bom trabalho. 🎉</p>}
      <div className="flex gap-3">
        <button onClick={() => setRodando((r) => !r)} className="rounded-full bg-white/20 px-6 py-3 font-semibold backdrop-blur">
          {rodando ? "Pausar" : "Continuar"}
        </button>
        <button onClick={onFechar} className="rounded-full bg-white px-6 py-3 font-semibold text-indigo-700">
          Encerrar
        </button>
      </div>
      <p className="mt-8 max-w-xs text-center text-sm text-indigo-200">Respire. Só esta tarefa importa agora.</p>
    </div>
  );
}
