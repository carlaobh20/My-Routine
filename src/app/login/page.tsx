"use client";

import { useState } from "react";
import { criarClienteBrowser } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar() {
    setErro("");
    const supabase = criarClienteBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    if (error) setErro(error.message);
    else setEnviado(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Ritmo</h1>
      {enviado ? (
        <p className="text-slate-600">Enviamos um link para <strong>{email}</strong>. Abra no iPhone.</p>
      ) : (
        <>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
          <button onClick={entrar} className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500">
            Receber link de acesso
          </button>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
        </>
      )}
    </main>
  );
}
