"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteBrowser } from "@/lib/supabase/client";
import Timeline from "@/components/Timeline";
import TaskForm from "@/components/TaskForm";
import PushManager from "@/components/PushManager";

export default function Home() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const supabase = criarClienteBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
      else setCarregando(false);
    });
  }, [router]);

  if (carregando) return <main className="p-6">Carregando...</main>;

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hoje</h1>
        <button
          onClick={async () => {
            const supabase = criarClienteBrowser();
            await supabase.auth.signOut();
            router.push("/login");
          }}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          Sair
        </button>
      </header>

      <PushManager />
      <TaskForm onCriado={() => setTick((t) => t + 1)} />
      <Timeline atualizar={tick} />
    </main>
  );
}
