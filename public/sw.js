// ============================================================
// Ritmo — Service Worker
// 🔴 No iOS, se um push chegar e o SW NÃO exibir uma notificação,
//    o sistema cancela a inscrição. Por isso sempre chamamos
//    showNotification() dentro de um event.waitUntil().
// ============================================================

self.addEventListener("push", (event) => {
  let dados = { title: "Ritmo", body: "Hora de mudar de tarefa." };
  try {
    if (event.data) dados = event.data.json();
  } catch (_) {
    if (event.data) dados.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(dados.title, {
      body: dados.body,
      tag: dados.tag || "ritmo",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge.png",
      // vibrate não é suportado no iOS, mas não atrapalha
      vibrate: [120, 60, 120],
    }),
  );
});

// ao tocar na notificação, foca/abre o app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cls) => {
      for (const c of cls) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    }),
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
