"use client";

import { criarClienteBrowser } from "./supabase/client";

// converte a chave VAPID pública (base64url) para o formato que o navegador exige
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
  // no iOS o push só funciona com o PWA instalado (standalone)
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error propriedade só do Safari iOS
    window.navigator.standalone === true
  );
}

// chame ao tocar em "Ativar notificações"
export async function ativarNotificacoes(): Promise<{ ok: boolean; msg: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, msg: "Seu navegador não suporta notificações push." };
  }
  if (ehIOS() && !estaInstalado()) {
    return { ok: false, msg: "No iPhone, instale o app na tela inicial antes de ativar." };
  }

  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return { ok: false, msg: "Permissão negada." };

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });

  const json = sub.toJSON();
  const supabase = criarClienteBrowser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, msg: "Faça login primeiro." };

  // upsert pelo endpoint (renova inscrição ao reabrir o app — importante no iOS)
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) return { ok: false, msg: error.message };
  return { ok: true, msg: "Notificações ativadas." };
}
