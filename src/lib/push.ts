"use client";

import { criarClienteBrowser } from "./supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function ehIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function estaInstalado() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error propriedade só do Safari iOS
    window.navigator.standalone === true
  );
}

export async function ativarNotificacoes(): Promise<{ ok: boolean; msg: string }> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { ok: false, msg: "Este navegador não suporta notificações push." };
    }
    if (ehIOS() && !estaInstalado()) {
      return { ok: false, msg: "No iPhone, instale o app na tela inicial antes de ativar." };
    }

    // 1) PERMISSÃO primeiro (funciona mesmo sem a chave configurada)
    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") return { ok: false, msg: "Permissão não concedida pelo iPhone." };

    // 2) só agora exige a chave VAPID
    const chave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!chave) {
      return { ok: false, msg: "Permissão OK! Falta só a chave VAPID no servidor (próximo passo)." };
    }

    // 3) registra o service worker e inscreve no push
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(chave),
    });

    const json = sub.toJSON();
    const supabase = criarClienteBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, msg: "Faça login primeiro." };

    const { error } = await supabase.from("push_subscriptions").upsert(
      { user_id: user.id, endpoint: json.endpoint!, p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      { onConflict: "endpoint" },
    );
    if (error) return { ok: false, msg: "Erro ao salvar inscrição: " + error.message };
    return { ok: true, msg: "Notificações ativadas! 🎉" };
  } catch (e) {
    return { ok: false, msg: "Falhou: " + (e instanceof Error ? e.message : String(e)) };
  }
}

// dispara uma notificação LOCAL de teste (não depende de servidor nem de VAPID)
export async function testarNotificacaoLocal(): Promise<{ ok: boolean; msg: string }> {
  try {
    if (!("serviceWorker" in navigator)) return { ok: false, msg: "Sem suporte a service worker." };
    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") return { ok: false, msg: "Permissão não concedida." };
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    await reg.showNotification("My Routine", { body: "Funcionou! É assim que o aviso vai aparecer.", tag: "teste" });
    return { ok: true, msg: "Enviei um teste — olhe a notificação!" };
  } catch (e) {
    return { ok: false, msg: "Falhou: " + (e instanceof Error ? e.message : String(e)) };
  }
}
