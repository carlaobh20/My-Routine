// ============================================================
// Ritmo — Edge Function "send-push" (Deno / Supabase)
// Envia web push (VAPID) para os blocos que começam agora.
// Deploy:  supabase functions deploy send-push
// Segredos: supabase secrets set VAPID_PRIVATE_KEY=... VAPID_PUBLIC_KEY=... VAPID_SUBJECT=mailto:...
// ============================================================
//
// OBS: web-push roda na Edge via especificador npm. Confirme a
// versão mais recente em npmjs.com/package/web-push antes do deploy.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service role: ignora RLS, só no servidor
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

Deno.serve(async () => {
  // 1. blocos começando na janela de agora (e ainda não notificados)
  const agora = new Date();
  const doisMinAtras = new Date(agora.getTime() - 2 * 60 * 1000);

  const { data: blocos, error } = await supabase
    .from("blocks")
    .select("id, user_id, titulo")
    .eq("notificado", false)
    .lte("hora_inicio", agora.toISOString())
    .gt("hora_inicio", doisMinAtras.toISOString());

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!blocos?.length) return new Response(JSON.stringify({ enviados: 0 }), { status: 200 });

  let enviados = 0;

  for (const bloco of blocos) {
    // 2. inscrições de push do dono do bloco
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", bloco.user_id);

    const payload = JSON.stringify({
      title: "⏱️ Hora de mudar",
      body: `Começa agora: ${bloco.titulo}`,
      tag: `bloco-${bloco.id}`,
    });

    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        enviados++;
      } catch (e) {
        // 410/404 = inscrição morta -> limpa do banco
        // deno-lint-ignore no-explicit-any
        const code = (e as any)?.statusCode;
        if (code === 404 || code === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    }

    // 3. marca como notificado para não reenviar
    await supabase.from("blocks").update({ notificado: true }).eq("id", bloco.id);
  }

  return new Response(JSON.stringify({ enviados }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
