"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteBrowser } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    setErro("");
    if (!email || senha.length < 6) {
      setErro("Informe um e-mail e uma senha de pelo menos 6 caracteres.");
      return;
    }
    setCarregando(true);
    const supabase = criarClienteBrowser();

    if (modo === "criar") {
      const { data, error } = await supabase.auth.signUp({ email, password: senha });
      if (error) { setErro(error.message); setCarregando(false); return; }
      if (!data.session) {
        setErro("Conta criada, mas falta confirmar o e-mail. Desligue 'Confirm email' no Supabase.");
        setCarregando(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) { setErro("E-mail ou senha incorretos."); setCarregando(false); return; }
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6 dark:bg-slate-950">
      <div className="mb-2 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white">R</div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Routine</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {modo === "criar" ? "Crie sua conta" : "Entre na sua conta"}
        </p>
      </div>
      <input
        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="seu@email.com"
        onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
        className="rounded-xl border-0 bg-slate-100 px-4 py-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-400 dark:bg-slate-800 dark:text-slate-100"
      />
      <input
        type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
        placeholder="senha (mín. 6 caracteres)"
        onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
        className="rounded-xl border-0 bg-slate-100 px-4 py-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-400 dark:bg-slate-800 dark:text-slate-100"
      />
      <button
        onClick={enviar} disabled={carregando}
        className="rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {carregando ? "Aguarde..." : modo === "criar" ? "Criar conta" : "Entrar"}
      </button>
      {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
      <button
        onClick={() => { setModo(modo === "criar" ? "entrar" : "criar"); setErro(""); }}
        className="text-sm text-slate-500 underline dark:text-slate-400"
      >
        {modo === "criar" ? "Já tenho conta — entrar" : "Não tenho conta — criar"}
      </button>
    </main>
  );
}
