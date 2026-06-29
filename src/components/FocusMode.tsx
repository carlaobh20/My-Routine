"use client";

import { useEffect, useState } from "react";

export default function FocusMode({
  titulo, duracaoMin, fimEm, onFechar,
}: { titulo: string; duracaoMin: number; fimEm?: number; onFechar: () => void }) {
  const totalSeg = duracaoMin * 60;
  const calc = () => (fimEm ? Math.max(0, Math.round((fimEm - Date.now()) / 1000)) : totalSeg);
  const [seg, setSeg] = useState(calc());
  const [rodando, setRodando] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      if (fimEm) setSeg(Math.max(0, Math.round((fimEm - Date.now()) / 1000)));
      else setSeg((s) => (rodando ? (s > 0 ? s - 1 : 0) : s));
    }, 1000);
    return () => clearInterval(t);
  }, [rodando, fimEm]);

  const hh = Math.floor(seg / 3600);
  const mm = Math.floor((seg % 3600) / 60);
  const ss = seg % 60;
  const tempo = hh > 0
    ? `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  const R = 130, C = 2 * Math.PI * R;
  const frac = totalSeg > 0 ? Math.max(0, Math.min(1, seg / totalSeg)) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-indigo-600 px-8 text-white">
      <p className="text-sm uppercase tracking-[0.3em] text-indigo-200">Foco</p>
      <h2 className="mt-3 text-center text-2xl font-bold">{titulo}</h2>

      <div className="relative my-10 flex h-72 w-72 items-center justify-center">
        <svg viewBox="0 0 300 300" className="absolute h-full w-full -rotate-90">
          <circle cx="150" cy="150" r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="14" />
          <circle cx="150" cy="150" r={R} fill="none" stroke="white" strokeWidth="14" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - frac)} style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <div className="text-center">
          <div className="text-6xl font-bold tabular-nums">{tempo}</div>
          <div className="mt-1 text-sm text-indigo-200">{fimEm ? "até terminar" : "restante"}</div>
        </div>
      </div>

      {seg === 0 && <p className="mb-6 text-indigo-100">Tempo! Bom trabalho. 🎉</p>}

      <div className="flex gap-3">
        {!fimEm && (
          <button onClick={() => setRodando((r) => !r)} className="rounded-full bg-white/20 px-6 py-3 font-semibold backdrop-blur">
            {rodando ? "Pausar" : "Continuar"}
          </button>
        )}
        <button onClick={onFechar} className="rounded-full bg-white px-6 py-3 font-semibold text-indigo-700">Encerrar</button>
      </div>
      <p className="mt-8 max-w-xs text-center text-sm text-indigo-200">Respire. Só esta tarefa importa agora.</p>
    </div>
  );
}
