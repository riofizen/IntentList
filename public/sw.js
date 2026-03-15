const CACHE_NAME = 'intentlist-v1';

// App shell files to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/logo.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip Supabase / API calls — always go network for these
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('supabase') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('mixkit')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache successful responses for same-origin static assets
        if (
          response.ok &&
          response.type === 'basic' &&
          (url.pathname.startsWith('/assets/') || url.pathname === '/logo.png')
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — serve cached index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
