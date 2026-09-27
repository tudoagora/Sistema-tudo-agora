# Cache offline do app shell.
# Estratégia deliberadamente simples: network-first para navegação (o
# diretório muda o dia todo e dados velhos são piores que erro), cache-first
# só para estáticos imutáveis e para a navigation preload.

const CACHE = "ta-v1";
const PRELOAD = "next-headers";
const OFFLINE = "/offline";

const SHELL = ["/", "/offline", "/icone-192.png", "/icone-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Estáticos com hash no nome: imutáveis, pode ir direto do cache.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            const copy = response.clone();
            void caches.open(PRELOAD).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // Demais requisições same-origin: rede primeiro, cache como rede de segurança.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const hit = await caches.match(request);
        if (hit) return hit;
        if (request.mode === "navigate") {
          const offline = await caches.match(OFFLINE);
          if (offline) return offline;
        }
        return new Response("Sem conexão", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }),
  );
});
