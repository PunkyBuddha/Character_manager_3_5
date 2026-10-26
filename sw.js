/**
 * Service Worker para funcionamento 100% Offline (PWA) no iPhone e Navegadores Modernos
 * D&D 3.5 · Ficha de Personagem & Mestre das Muitas Formas
 */

const CACHE_NAME = 'dnd35-momf-cache-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './model.js',
  './character-options.js',
  './ability-bonuses.js',
  './ability-bonuses-ui.js',
  './weapons.js',
  './weapons-ui.js',
  './dice.js',
  './attack-dice.js',
  './special-skills.js',
  './languages.js',
  './catalog.js',
  './known-spell-details.js',
  './spells-data.js',
  './momf-model.js',
  './momf-ui.js',
  './data/creatures_data.js',
  './manifest.json',
  './icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pré-carregando arquivos estáticos para acesso offline...');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Aviso ao cachear alguns recursos:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Ignora requisições não-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Retorna do cache imediatamente para máxima velocidade
        return cachedResponse;
      }

      // Se não estiver no cache, busca na rede e guarda no cache
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback para index.html se for navegação
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
