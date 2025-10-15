const CACHE_VERSION = 'v4';
const CACHE_NAME = `mathmonsters-cache-${CACHE_VERSION}`;
const OFFLINE_ASSETS = [
  './',
  './index.html',
  './html/welcome.html',
  './html/signin.html',
  './html/register.html',
  './html/battle.html',
  './manifest.webmanifest',
  './css/index.css',
  './css/battle.css',
  './css/question.css',
  './css/signin.css',
  './js/pwa.js',
  './js/index.js',
  './js/battle.js',
  './js/question.js',
  './js/signin.js',
  './js/welcome.js',
  './js/supabaseClient.js',
  './js/loader.js',
  'images/brand/logo.png',
  'images/hero/shellfin_evolution_1.png',
  'images/hero/shellfin_evolution_2.png',
  'images/hero/shellfin_attack_1.png',
  'images/hero/shellfin_attack_2.png',
  'images/battle/battle_time.png',
  'images/monster/addition_battle_1.png',
  'images/monster/addition_battle_2.png',
  'images/monster/addition_battle_3.png',
  'images/monster/addition_battle_4.png',
  'images/monster/addition_battle_5.png',
  'images/monster/monster_attack.png',
  'images/home/medal_1.png',
  'images/complete/gem.png',
  'images/questions/shield.svg',
  './data/levels.json',
  './data/player.json',
  './data/questions/level_1_questions.json',
  './data/questions/level_2_questions.json',
  './data/questions/level_3_questions.json',
  './data/questions/level_4_questions.json',
  './data/questions/level_5_questions.json',
  './data/questions/level_6_questions.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(OFFLINE_ASSETS);
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestURL = new URL(event.request.url);

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (requestURL.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          const isBattleVariant =
            requestURL.pathname.endsWith('/html/battle.html') &&
            requestURL.search;

          if (isBattleVariant) {
            const fallbackBattle = await caches.match('./html/battle.html');
            if (fallbackBattle) {
              return fallbackBattle;
            }
          }

          return caches.match('./index.html');
        });
    })
  );
});
